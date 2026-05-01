import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherRewardWinners from "@/app/models/TeacherRewardWinners";
import TeacherActivity from "@/app/models/TeacherActivity";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

async function resolveTermId(schoolId: mongoose.Types.ObjectId, termIdQuery?: string) {
  if (termIdQuery) {
    const t = await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termIdQuery) }).lean();
    return t ? t._id : null;
  }
  const t = await Term.findOne({ schoolId, isActive: true }).lean();
  return t ? t._id : null;
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER")) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const termId = await resolveTermId(schoolId, searchParams.get("termId") || undefined);
    if (!termId) return NextResponse.json({ error: "Term not found" }, { status: 404 });

    const winners = await TeacherRewardWinners.find({ schoolId, termId }).sort({ rank: 1 }).lean();
    const self = user.role === "TEACHER"
      ? winners.find((w) => w.teacherId.toString() === user.userId) || null
      : null;

    return NextResponse.json({ termId: termId.toString(), winners, finalized: winners.length > 0, self });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch rewards" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const termId = await resolveTermId(schoolId, body?.termId || undefined);
    if (!termId) return NextResponse.json({ error: "Term not found" }, { status: 404 });

    const existing = await TeacherRewardWinners.find({ schoolId, termId }).lean();
    if (existing.length > 0 && !body?.forceRecompute) {
      return NextResponse.json({ error: "Winners already finalized for this term", hint: "Pass forceRecompute=true to overwrite" }, { status: 409 });
    }

    // Build leaderboard from TeacherActivity
    const activities = await TeacherActivity.find({ schoolId, termId }).lean();
    const pointsByTeacher = new Map<string, number>();
    for (const act of activities) {
      const tid = act.teacherId.toString();
      pointsByTeacher.set(tid, (pointsByTeacher.get(tid) || 0) + (act.points || 1));
    }

    const leaderboard = [...pointsByTeacher.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([teacherId, points], index) => ({ teacherId, points, rank: index + 1, breakdown: {} }));

    if (existing.length > 0) await TeacherRewardWinners.deleteMany({ schoolId, termId });

    const now = new Date();
    await TeacherRewardWinners.insertMany(
      leaderboard.map((item) => ({
        schoolId,
        termId,
        teacherId: new mongoose.Types.ObjectId(item.teacherId),
        rank: item.rank,
        points: item.points,
        breakdown: item.breakdown,
        finalizedBy: new mongoose.Types.ObjectId(admin.userId),
        note: body?.note ? String(body.note) : null,
      }))
    );

    return NextResponse.json({ message: "Top 5 rewards finalized for term", termId: termId.toString(), winners: leaderboard, giftedCount: leaderboard.length });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to finalize rewards" }, { status: 500 });
  }
}

export async function PATCH(req: Request) { return POST(req); }
export async function PUT(req: Request) { return POST(req); }
export async function DELETE() { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }
