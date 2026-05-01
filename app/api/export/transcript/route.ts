import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const student = await Student.findOne({ schoolId, _id: new mongoose.Types.ObjectId(studentId) }).lean();
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    const scores = await Score.find({ schoolId, studentId: new mongoose.Types.ObjectId(studentId) }).lean();
    const subjectIds = scores.map((s) => s.subjectId);
    const subjects = subjectIds.length ? await Subject.find({ _id: { $in: subjectIds } }).lean() : [];
    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), (s as {name: string}).name]));
    return NextResponse.json({
      student: { fullName: (student as {fullName: string}).fullName, admissionNumber: (student as {admissionNumber: string}).admissionNumber },
      data: scores.map((s) => ({
        subjectName: subjectMap.get(s.subjectId.toString()) || "Unknown",
        term: s.term,
        classwork: s.classwork,
        homework: s.homework,
        test: s.test,
        exam: s.exam,
        total: s.total,
        grade: (s as Record<string, unknown>).grade,
      }))
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 });
  }
}
