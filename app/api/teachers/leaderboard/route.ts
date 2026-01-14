import connectDB from "@/app/utils/db";
import TeacherActivity from "@/app/models/TeacherActivity";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  await connectDB();
  const token = req.headers.get("authorization")?.split(" ")[1];
  const admin: any = verifyToken(token || "");

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const leaderboard = await TeacherActivity.aggregate([
    { $match: { schoolId: admin.schoolId } },
    { $group: { _id: "$teacherId", points: { $sum: 1 } } },
    { $sort: { points: -1 } },
    { $limit: 10 }
  ]);

  return NextResponse.json({ leaderboard });
}
