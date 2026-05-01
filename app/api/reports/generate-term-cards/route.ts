import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import ReportCard from "@/app/models/ReportCard";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

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

    const term = termId
      ? await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termId) }).lean()
      : await Term.findOne({ schoolId, isActive: true }).lean();
    if (!term) return NextResponse.json({ error: "Term not found" }, { status: 404 });

    // Aggregate DailyMarks by student + subject
    const marks = await DailyMark.aggregate([
      { $match: { schoolId, classId: new mongoose.Types.ObjectId(classId), termId: term._id } },
      {
        $group: {
          _id: { studentId: "$studentId", subjectId: "$subjectId" },
          avgScore: { $avg: "$score" },
          maxScore: { $max: "$score" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Group by student
    const byStudent = new Map<string, Array<{subjectId: string; score: number; count: number}>>();
    for (const m of marks) {
      const sid = m._id.studentId.toString();
      if (!byStudent.has(sid)) byStudent.set(sid, []);
      byStudent.get(sid)!.push({ subjectId: m._id.subjectId.toString(), score: Math.round(m.avgScore), count: m.count });
    }

    const students = await Student.find({ schoolId, currentClassId: new mongoose.Types.ObjectId(classId) }).lean();
    let generated = 0;

    for (const student of students) {
      const sid = student._id.toString();
      const subjectScores = byStudent.get(sid) || [];
      const totalScore = subjectScores.reduce((a, b) => a + b.score, 0);
      const average = subjectScores.length > 0 ? Math.round(totalScore / subjectScores.length) : 0;

      await ReportCard.findOneAndUpdate(
        { schoolId, studentId: student._id, classId: new mongoose.Types.ObjectId(classId), termId: term._id },
        {
          $set: {
            academicYearId: term.academicYearId,
            subjectScores: subjectScores.map((s) => ({ subjectId: new mongoose.Types.ObjectId(s.subjectId), score: s.score })),
            totalScore,
            average,
          },
        },
        { upsert: true }
      );
      generated++;
    }

    // Assign positions within the class
    const reports = await ReportCard.find({ schoolId, classId: new mongoose.Types.ObjectId(classId), termId: term._id }).lean();
    const sorted = [...reports].sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
    for (let i = 0; i < sorted.length; i++) {
      await ReportCard.updateOne({ _id: sorted[i]._id }, { $set: { position: i + 1 } });
    }

    return NextResponse.json({ message: "Term report cards generated", generated, classId, termId: term._id.toString() });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate term cards" }, { status: 500 });
  }
}
