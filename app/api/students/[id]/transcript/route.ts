import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import Score from "@/app/models/Score";
import ReportCard from "@/app/models/ReportCard";
import Subject from "@/app/models/Subject";
import AcademicYear from "@/app/models/AcademicYear";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const studentId = new mongoose.Types.ObjectId(id);

    const student = await Student.findOne({ schoolId, _id: studentId }).lean();
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const [scores, reportCards, subjects, terms, years] = await Promise.all([
      Score.find({ schoolId, studentId }).lean(),
      ReportCard.find({ schoolId, studentId }).lean(),
      Subject.find({ schoolId }).lean(),
      Term.find({ schoolId }).lean(),
      AcademicYear.find({ schoolId }).lean(),
    ]);

    const subjectMap = new Map((subjects as {_id: mongoose.Types.ObjectId; name: string}[]).map((s) => [s._id.toString(), s.name]));
    const termMap = new Map((terms as {_id: mongoose.Types.ObjectId; termNumber: number; academicYearId: mongoose.Types.ObjectId}[]).map((t) => [t._id.toString(), t]));
    const yearMap = new Map((years as {_id: mongoose.Types.ObjectId; name: string}[]).map((y) => [y._id.toString(), y.name]));

    return NextResponse.json({
      student: { _id: (student as {_id: mongoose.Types.ObjectId})._id.toString(), fullName: (student as {fullName: string}).fullName, admissionNumber: (student as {admissionNumber: string}).admissionNumber },
      scores: scores.map((s) => ({
        subjectId: s.subjectId.toString(),
        subjectName: subjectMap.get(s.subjectId.toString()) || "Unknown",
        term: s.term,
        academicYear: yearMap.get(s.academicYearId?.toString() || "") || "Unknown",
        classwork: s.classwork,
        homework: s.homework,
        test: s.test,
        exam: s.exam,
        total: s.total,
        grade: (s as Record<string, unknown>).grade,
      })),
      reportCards: reportCards.map((r) => ({
        _id: r._id.toString(),
        termId: r.termId.toString(),
        average: r.average,
        position: r.position,
        isReleased: Boolean(r.approvedBy),
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch transcript" }, { status: 500 });
  }
}
