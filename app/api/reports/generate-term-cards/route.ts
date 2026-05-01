import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
import ReportCard from "@/app/models/ReportCard";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
import Class from "@/app/models/Class";
import AcademicYear from "@/app/models/AcademicYear";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

function computeGrade(total: number): string {
  if (total >= 75) return "A1";
  if (total >= 70) return "B2";
  if (total >= 65) return "B3";
  if (total >= 60) return "C4";
  if (total >= 55) return "C5";
  if (total >= 50) return "C6";
  if (total >= 45) return "D7";
  if (total >= 40) return "E8";
  return "F9";
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const classId = String(body?.classId || "").trim();
    const termId = String(body?.termId || "").trim();
    if (!classId) return NextResponse.json({ error: "classId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const classOId = new mongoose.Types.ObjectId(classId);

    // Resolve term
    const term = termId
      ? await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termId) }).lean()
      : await Term.findOne({ schoolId, isActive: true }).lean();
    if (!term) return NextResponse.json({ error: "Term not found" }, { status: 404 });

    // Resolve class name and academic year name
    const [cls, academicYear] = await Promise.all([
      Class.findOne({ schoolId, _id: classOId }).lean(),
      AcademicYear.findOne({ _id: term.academicYearId }).lean(),
    ]);
    const className = cls ? `${(cls as {level: string; arm: string}).level} ${(cls as {level: string; arm: string}).arm}` : "Unknown Class";
    const yearNumber = academicYear
      ? parseInt(String((academicYear as {name: string}).name).match(/\d{4}/)?.[0] || String(new Date().getFullYear()), 10)
      : new Date().getFullYear();

    // Fetch all students in this class
    const students = await Student.find({ schoolId, currentClassId: classOId }).lean();
    const classSize = students.length;
    if (classSize === 0) {
      return NextResponse.json({ message: "No students found in class", generated: 0, classId, termId: term._id.toString() });
    }

    // Fetch all Score records for this class + term + academic year
    const scores = await Score.find({
      schoolId,
      classId: classOId,
      term: term.termNumber,
      academicYearId: term.academicYearId,
    }).lean();

    // Fetch subjects to get names
    const subjectIdStrings = [...new Set(scores.map((s) => s.subjectId.toString()))];
    const subjects = subjectIdStrings.length
      ? await Subject.find({ _id: { $in: subjectIdStrings } }).select("_id name").lean()
      : [];
    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), (s as {name: string}).name]));

    // Group scores by student
    const byStudent = new Map<string, typeof scores>();
    for (const score of scores) {
      const sid = score.studentId.toString();
      if (!byStudent.has(sid)) byStudent.set(sid, []);
      byStudent.get(sid)!.push(score);
    }

    let generated = 0;

    for (const student of students) {
      const sid = student._id.toString();
      const studentScores = byStudent.get(sid) || [];

      const subjectScores = studentScores.map((s) => {
        const cw = s.classwork ?? 0;
        const hw = s.homework ?? 0;
        const tst = s.test ?? 0;
        const ex = s.exam ?? 0;
        const total = cw + hw + tst + ex;
        const grade = (s as Record<string, unknown>).grade as string || computeGrade(total);
        return {
          subjectId: s.subjectId,
          subjectName: subjectMap.get(s.subjectId.toString()) || "Unknown",
          classwork: cw,
          homework: hw,
          test: tst,
          exam: ex,
          total,
          grade,
          teacherRemark: "",
          subjectTeacherId: s.teacherId,
        };
      });

      const totalScore = subjectScores.reduce((acc, s) => acc + s.total, 0);
      const averageScore = subjectScores.length > 0
        ? Math.round((totalScore / subjectScores.length) * 10) / 10
        : 0;

      await ReportCard.findOneAndUpdate(
        { schoolId, studentId: student._id, classId: classOId, termId: term._id },
        {
          $set: {
            academicYearId: term.academicYearId,
            className,
            term: term.termNumber,
            year: yearNumber,
            subjectScores,
            totalScore,
            averageScore,
            classSize,
            promotionStatus: "PROMOTED",  // default; admin can override
          },
          $setOnInsert: {
            printCount: 0,
            printHistory: [],
          },
        },
        { upsert: true, new: true }
      );
      generated++;
    }

    // Compute class ranking — sort by averageScore desc
    const reports = await ReportCard.find({ schoolId, classId: classOId, termId: term._id }).lean();
    const sorted = [...reports].sort((a, b) => ((b as Record<string, number>).averageScore ?? 0) - ((a as Record<string, number>).averageScore ?? 0));
    for (let i = 0; i < sorted.length; i++) {
      await ReportCard.updateOne({ _id: sorted[i]._id }, { $set: { classRanking: i + 1, classSize: sorted.length } });
    }

    return NextResponse.json({ message: "Term report cards generated", generated, classId, termId: term._id.toString() });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate term cards" }, { status: 500 });
  }
}
