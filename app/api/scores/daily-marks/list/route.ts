import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const filter: Record<string, unknown> = { schoolId };
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const studentId = searchParams.get("studentId");
    const assessmentType = searchParams.get("assessmentType");
    const termId = searchParams.get("termId");

    if (classId) filter.classId = new mongoose.Types.ObjectId(classId);
    if (subjectId) filter.subjectId = new mongoose.Types.ObjectId(subjectId);
    if (studentId) filter.studentId = new mongoose.Types.ObjectId(studentId);
    if (assessmentType) filter.assessmentType = assessmentType.toUpperCase();

    if (termId) {
      filter.termId = new mongoose.Types.ObjectId(termId);
    } else {
      const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
      if (activeTerm) filter.termId = activeTerm._id;
    }

    const marks = await DailyMark.find(filter).sort({ assessmentDate: -1 }).lean();

    const studentIds = [...new Set(marks.map((m) => m.studentId.toString()))];
    const subjectIds = [...new Set(marks.map((m) => m.subjectId.toString()))];

    const [students, subjects] = await Promise.all([
      studentIds.length ? Student.find({ _id: { $in: studentIds } }).select("_id fullName").lean() : [],
      subjectIds.length ? Subject.find({ _id: { $in: subjectIds } }).select("_id name").lean() : [],
    ]);

    const studentMap = new Map(students.map((s) => [s._id.toString(), s.fullName]));
    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), s.name]));

    return NextResponse.json({
      dailyMarks: marks.map((m) => ({
        _id: m._id.toString(),
        studentId: m.studentId.toString(),
        studentName: studentMap.get(m.studentId.toString()) || "Unknown",
        subjectId: m.subjectId.toString(),
        subjectName: subjectMap.get(m.subjectId.toString()) || "Unknown",
        classId: m.classId.toString(),
        assessmentType: m.assessmentType,
        score: m.score,
        assessmentDate: m.assessmentDate || m.recordedDate || null,
        notes: (m as Record<string, unknown>).feedbackNotes as string || null,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list daily marks" }, { status: 500 });
  }
}
