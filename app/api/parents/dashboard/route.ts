import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ParentWardLink from "@/app/models/ParentWardLink";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
import AcademicYear from "@/app/models/AcademicYear";
import ReportCard from "@/app/models/ReportCard";
import Class from "@/app/models/Class";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const parent: ITokenPayload | null = verifyToken(token || "");
    if (!parent || parent.role !== "PARENT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(parent.schoolId);
    const parentId = new mongoose.Types.ObjectId(parent.userId);

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    const activeYear = activeTerm
      ? await AcademicYear.findOne({ schoolId, _id: activeTerm.academicYearId }).lean()
      : null;

    const wardLinks = await ParentWardLink.find({ schoolId, parentId }).lean();
    const wardIds = wardLinks.map((w) => w.studentId);

    const wardStudents = wardIds.length
      ? await Student.find({ schoolId, _id: { $in: wardIds } }).lean()
      : [];

    const classIds = [...new Set(wardStudents.map((s) => s.currentClassId?.toString()).filter(Boolean))];
    const classMap = classIds.length
      ? new Map((await Class.find({ _id: { $in: classIds } }).lean()).map((c) => [c._id.toString(), c]))
      : new Map();

    const wards = wardStudents.map((s) => ({
      id: s._id.toString(),
      fullName: s.fullName,
      admissionNumber: s.admissionNumber,
      dateOfBirth: s.dateOfBirth,
      gender: s.gender,
      className: s.currentClassId ? (classMap.get(s.currentClassId.toString()) as { level?: string; arm?: string } | undefined)
        ? ((classMap.get(s.currentClassId.toString()) as { level?: string; arm?: string })!.level + " " + (classMap.get(s.currentClassId.toString()) as { level?: string; arm?: string })!.arm).trim()
        : null : null,
    }));

    const reportCount =
      activeTerm && wardIds.length
        ? await ReportCard.countDocuments({ schoolId, studentId: { $in: wardIds }, termId: activeTerm._id, approvedBy: { $ne: null } })
        : 0;

    return NextResponse.json({
      wards,
      stats: {
        wardsCount: wards.length,
        activeTerm: activeTerm && activeYear ? `${activeYear.name} T${activeTerm.termNumber}` : "N/A",
        reportsAvailable: reportCount,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch parent dashboard" }, { status: 500 });
  }
}
