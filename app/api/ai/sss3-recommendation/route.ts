import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
import AuditLog from "@/app/models/AuditLog";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
import mongoose from "mongoose";

const CLUSTERS: Record<string, string[]> = {
  "Medicine/Science": ["Biology", "Chemistry", "Physics", "Mathematics"],
  "Engineering/Tech": ["Mathematics", "Physics", "Technical Drawing", "Further Mathematics"],
  "Law/Humanities": ["Literature in English", "Government", "History", "English Language"],
  "Business/Economics": ["Economics", "Commerce", "Accounting", "Mathematics"],
  "Education": ["English Language", "Mathematics"],
  "Agriculture": ["Agricultural Science", "Biology", "Chemistry"],
};

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

    const scores = await Score.find({ schoolId, studentId: new mongoose.Types.ObjectId(studentId) }).lean();
    const subjectIds = scores.map((s) => s.subjectId);
    const subjects = subjectIds.length ? await Subject.find({ _id: { $in: subjectIds } }).lean() : [];
    const subjectNameMap = new Map(subjects.map((s) => [s._id.toString(), s.name]));

    const scoreMap = new Map<string, number>();
    for (const s of scores) {
      const name = subjectNameMap.get(s.subjectId.toString()) || "";
      scoreMap.set(name, Math.max(scoreMap.get(name) || 0, s.total ?? s.exam ?? 0));
    }

    const clusterScores = Object.entries(CLUSTERS).map(([cluster, keywords]) => {
      const matched = keywords.filter((k) => [...scoreMap.keys()].some((n) => n.toLowerCase().includes(k.toLowerCase())));
      const avg = matched.length > 0 ? matched.reduce((a, k) => a + ([...scoreMap.entries()].find(([n]) => n.toLowerCase().includes(k.toLowerCase()))?.[1] ?? 0), 0) / matched.length : 0;
      return { cluster, score: Math.round(avg), matched };
    }).sort((a, b) => b.score - a.score);

    const recommendation = clusterScores[0].cluster;
    const student = await Student.findOne({ schoolId, _id: new mongoose.Types.ObjectId(studentId) }).lean();

    await AuditLog.create({
      schoolId,
      userId: new mongoose.Types.ObjectId(user.userId),
      action: "AI_SSS3_RECOMMENDATION_GENERATED",
      meta: { studentId, recommendation, clusterScores: clusterScores.slice(0, 3), studentName: student ? (student as {fullName: string}).fullName : "Unknown" },
    });

    return NextResponse.json({ studentId, recommendation, clusterScores: clusterScores.slice(0, 3) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate SSS3 recommendation" }, { status: 500 });
  }
}
