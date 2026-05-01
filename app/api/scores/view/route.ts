import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
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
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const termId = searchParams.get("termId");

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    let filter: Record<string, unknown> = { schoolId };
    if (classId) filter.classId = new mongoose.Types.ObjectId(classId);
    if (subjectId) filter.subjectId = new mongoose.Types.ObjectId(subjectId);

    if (termId) {
      const term = await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termId) }).lean();
      if (term) {
        filter.term = term.termNumber;
        filter.academicYearId = term.academicYearId;
      }
    } else {
      const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
      if (activeTerm) {
        filter.term = activeTerm.termNumber;
        filter.academicYearId = activeTerm.academicYearId;
      }
    }

    const scores = await Score.find(filter).lean();

    const studentIds = [...new Set(scores.map((s) => s.studentId.toString()))];
    const subjectIds = [...new Set(scores.map((s) => s.subjectId.toString()))];

    const [students, subjects] = await Promise.all([
      studentIds.length ? Student.find({ _id: { $in: studentIds } }).select("_id fullName admissionNumber").lean() : [],
      subjectIds.length ? Subject.find({ _id: { $in: subjectIds } }).select("_id name").lean() : [],
    ]);

    const studentMap = new Map(students.map((s) => [s._id.toString(), s]));
    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), s]));

    return NextResponse.json({
      scores: scores.map((s) => {
        const student = studentMap.get(s.studentId.toString());
        const subject = subjectMap.get(s.subjectId.toString());
        return {
          _id: s._id.toString(),
          studentId: s.studentId.toString(),
          studentName: student?.fullName || "Unknown",
          admissionNumber: student?.admissionNumber || "",
          subjectId: s.subjectId.toString(),
          subjectName: subject?.name || "Unknown",
          classwork: s.classwork ?? null,
          homework: s.homework ?? null,
          test: s.test ?? null,
          exam: s.exam ?? null,
          total: s.total ?? null,
          grade: (s as Record<string, unknown>).grade ?? null,
          score: s.total ?? null,
        };
      }),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch scores" }, { status: 500 });
  }
}
