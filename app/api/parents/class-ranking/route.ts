import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ParentWardLink from "@/app/models/ParentWardLink";
import ReportCard from "@/app/models/ReportCard";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const parent: ITokenPayload | null = verifyToken(token || "");
    if (!parent || parent.role !== "PARENT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(parent.schoolId);
    const parentId = new mongoose.Types.ObjectId(parent.userId);

    const wardLinks = await ParentWardLink.find({ schoolId, parentId }).lean();
    const wardIds = wardLinks.map((w) => w.studentId);
    if (!wardIds.length) return NextResponse.json({ rankings: [] });

    const termId = searchParams.get("termId");
    const term = termId
      ? await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termId) }).lean()
      : await Term.findOne({ schoolId, isActive: true }).lean();
    if (!term) return NextResponse.json({ rankings: [] });

    const wardStudents = await Student.find({ schoolId, _id: { $in: wardIds } }).lean();
    const classIds = [...new Set(wardStudents.map((s) => s.currentClassId?.toString()).filter(Boolean))];

    const rankings = [];
    for (const classId of classIds) {
      const reports = await ReportCard.find({ schoolId, classId: new mongoose.Types.ObjectId(classId!), termId: term._id }).lean();
      if (!reports.length) continue;

      const sorted = [...reports].sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
      const studentIds = sorted.map((r) => r.studentId);
      const students = await Student.find({ _id: { $in: studentIds } }).select("_id fullName").lean();
      const studentNameMap = new Map(students.map((s) => [s._id.toString(), s.fullName]));

      const myWardIds = new Set(wardIds.map((id) => id.toString()));

      rankings.push({
        classId,
        classTotal: sorted.length,
        ranking: sorted.map((r, index) => ({
          position: r.position ?? (index + 1),
          studentId: r.studentId.toString(),
          studentName: studentNameMap.get(r.studentId.toString()) || "Unknown",
          average: r.average ?? 0,
          isMyWard: myWardIds.has(r.studentId.toString()),
        })),
      });
    }

    return NextResponse.json({ rankings });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch class ranking" }, { status: 500 });
  }
}
