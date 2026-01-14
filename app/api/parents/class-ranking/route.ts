import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import Score from "@/app/models/Score";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  await connectDB();
  const token = req.headers.get("authorization")?.split(" ")[1];
  const parent: any = verifyToken(token || "");

  if (!parent || parent.role !== "PARENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const students = await Student.find({ parentId: parent.id });
  const classId = students[0]?.currentClassId;

  const scores = await Score.aggregate([
    { $match: { classId } },
    { $group: { _id: "$studentId", total: { $sum: "$total" } } },
    { $sort: { total: -1 } }
  ]);

  return NextResponse.json({ ranking: scores });
}
