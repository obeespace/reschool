import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
import AuditLog from "@/app/models/AuditLog";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
import Subject from "@/app/models/Subject";
import mongoose from "mongoose";

const SCIENCE_KEYWORDS = ["Biology", "Chemistry", "Physics", "Further Mathematics", "Agricultural Science", "Technical Drawing"];
const COMMERCIAL_KEYWORDS = ["Economics", "Commerce", "Accounting", "Business Studies", "Book Keeping"];
const ARTS_KEYWORDS = ["Literature in English", "Government", "History", "Christian Religious Studies", "Islamic Studies", "French", "Yoruba", "Hausa", "Igbo"];

function computeTrackScore(subjectNames: string[], scores: Map<string, number>, keywords: string[]): number {
  let total = 0; let count = 0;
  for (const [name, score] of scores) {
    if (keywords.some((k) => name.toLowerCase().includes(k.toLowerCase()))) { total += score; count++; }
  }
  return count > 0 ? total / count : 0;
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const studentId = String(body?.studentId || "").trim();
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();

    const scores = await Score.find({ schoolId, studentId: new mongoose.Types.ObjectId(studentId), ...(activeTerm ? { academicYearId: activeTerm.academicYearId } : {}) }).lean();
    const subjectIds = scores.map((s) => s.subjectId);
    const subjects = subjectIds.length ? await Subject.find({ _id: { $in: subjectIds } }).lean() : [];
    const subjectNameMap = new Map(subjects.map((s) => [s._id.toString(), s.name]));

    const scoreMap = new Map<string, number>();
    for (const s of scores) {
      const name = subjectNameMap.get(s.subjectId.toString()) || "";
      scoreMap.set(name, Math.max(scoreMap.get(name) || 0, s.total ?? s.exam ?? 0));
    }

    const scienceScore = computeTrackScore([], scoreMap, SCIENCE_KEYWORDS);
    const commercialScore = computeTrackScore([], scoreMap, COMMERCIAL_KEYWORDS);
    const artsScore = computeTrackScore([], scoreMap, ARTS_KEYWORDS);

    const scores3 = [
      { track: "Science", score: scienceScore },
      { track: "Commercial", score: commercialScore },
      { track: "Arts", score: artsScore },
    ].sort((a, b) => b.score - a.score);

    const recommendation = scores3[0].track;

    const student = await Student.findOne({ schoolId, _id: new mongoose.Types.ObjectId(studentId) }).lean();
    await AuditLog.create({
      schoolId,
      userId: new mongoose.Types.ObjectId(user.userId),
      action: "AI_JSS3_RECOMMENDATION_GENERATED",
      meta: { studentId, recommendation, scores: scores3, studentName: student ? (student as {fullName: string}).fullName : "Unknown" },
    });

    return NextResponse.json({ studentId, recommendation, scores: scores3, confidence: scores3[0].score > 50 ? "HIGH" : "LOW" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate recommendation" }, { status: 500 });
  }
}
