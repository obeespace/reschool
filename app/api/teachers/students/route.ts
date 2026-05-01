import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import Student from "@/app/models/Students";
import ParentWardLink from "@/app/models/ParentWardLink";
import User from "@/app/models/User";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);
    const userId = new mongoose.Types.ObjectId(teacher.userId);

    const profile = await TeacherProfile.findOne({ schoolId, userId }).lean();
    if (!profile || !profile.classTeacherOf) return NextResponse.json({ students: [] });

    const students = await Student.find({ schoolId, currentClassId: profile.classTeacherOf }).lean();
    const studentIds = students.map((s) => s._id);

    const wardLinks = studentIds.length ? await ParentWardLink.find({ schoolId, studentId: { $in: studentIds } }).lean() : [];
    const parentIds = [...new Set(wardLinks.map((w) => w.parentId))];
    const parents = parentIds.length ? await User.find({ _id: { $in: parentIds } }).select("_id fullName email").lean() : [];
    const parentMap = new Map(parents.map((p) => [p._id.toString(), p]));
    const parentByStudent = new Map<string, string>();
    for (const link of wardLinks) {
      if (link.isPrimary || !parentByStudent.has(link.studentId.toString())) {
        parentByStudent.set(link.studentId.toString(), link.parentId.toString());
      }
    }

    return NextResponse.json({
      students: students.map((s) => {
        const parentId = parentByStudent.get(s._id.toString());
        const parent = parentId ? parentMap.get(parentId) : null;
        return {
          _id: s._id.toString(),
          id: s._id.toString(),
          fullName: s.fullName,
          admissionNumber: s.admissionNumber,
          gender: s.gender,
          parent: parent ? { id: parent._id.toString(), fullName: parent.fullName, email: parent.email } : null,
        };
      }),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch students" }, { status: 500 });
  }
}
