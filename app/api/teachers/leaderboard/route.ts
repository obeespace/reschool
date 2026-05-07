import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherRewardWinners from "@/app/models/TeacherRewardWinners";
import TeacherActivity from "@/app/models/TeacherActivity";
import Term from "@/app/models/Term";
import User from "@/app/models/User";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    let termId: mongoose.Types.ObjectId | undefined;
    let termName: string = "";
    const termIdQ = searchParams.get("termId");
    if (termIdQ) {
      const t = await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termIdQ) }).lean() as { _id: mongoose.Types.ObjectId; termNumber?: number; name?: string } | null;
      termId = t?._id;
      termName = t ? (t.name || `Term ${t.termNumber}`) : "";
    } else {
      const t = await Term.findOne({ schoolId, isActive: true }).lean() as { _id: mongoose.Types.ObjectId; termNumber?: number; name?: string } | null;
      termId = t?._id;
      termName = t ? (t.name || `Term ${t.termNumber}`) : "";
    }

    if (!termId) return NextResponse.json({ leaderboard: [] });

    const winners = await TeacherRewardWinners.find({ schoolId, termId }).sort({ rank: 1 }).lean();
    if (winners.length > 0) {
      const teacherIds = winners.map((w) => w.teacherId);
      const teachers = await User.find({ _id: { $in: teacherIds } }).select("_id fullName").lean();
      const teacherMap = new Map(teachers.map((t) => [t._id.toString(), t.fullName]));
      return NextResponse.json({
        leaderboard: winners.map((w) => ({
          rank: w.rank,
          teacherId: w.teacherId.toString(),
          teacherName: teacherMap.get(w.teacherId.toString()) || "Unknown",
          points: w.points,
          breakdown: w.breakdown,
        })),
        termId: termId.toString(),
        termName,
        finalized: true,
      });
    }

    // Live leaderboard from activities
    const activities = await TeacherActivity.find({ schoolId, termId }).lean();
    const pointsByTeacher = new Map<string, number>();
    for (const act of activities) {
      const tid = act.teacherId.toString();
      pointsByTeacher.set(tid, (pointsByTeacher.get(tid) || 0) + (act.points || 1));
    }

    const ranked = [...pointsByTeacher.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const teacherIds = ranked.map(([tid]) => new mongoose.Types.ObjectId(tid));
    const teachers = teacherIds.length ? await User.find({ _id: { $in: teacherIds } }).select("_id fullName").lean() : [];
    const teacherMap = new Map(teachers.map((t) => [t._id.toString(), t.fullName]));

    return NextResponse.json({
      leaderboard: ranked.map(([tid, points], index) => ({
        rank: index + 1,
        teacherId: tid,
        teacherName: teacherMap.get(tid) || "Unknown",
        points,
        breakdown: {},
      })),
      termId: termId.toString(),
      termName,
      finalized: false,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch leaderboard" }, { status: 500 });
  }
}
