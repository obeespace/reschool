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
  
  if (students.length === 0) {
    return NextResponse.json({ rankings: [] });
  }

  // Get rankings for each unique class
  const classIds = [...new Set(students.map(s => s.currentClassId.toString()))];
  const rankings: any = {};

  for (const classId of classIds) {
    const scores = await Score.aggregate([
      { $match: { classId: classId } },
      { $group: { _id: "$studentId", total: { $sum: "$total" } } },
      { $sort: { total: -1 } }
    ]);
    
    rankings[classId] = scores;
  }

  return NextResponse.json({ rankings });
}
