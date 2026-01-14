import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
import AIGuidance from "@/app/models/AIGuidance";
import Student from "@/app/models/Students";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await connectDB();
  const token = req.headers.get("authorization")?.split(" ")[1];
  const admin: any = verifyToken(token || "");

  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { studentId } = await req.json();

  const scores = await Score.find({ studentId });
  let science = 0, art = 0, commercial = 0;

  scores.forEach((s) => {
    if (["Math", "Physics", "Chemistry"].includes(s.subject)) science += s.total;
    if (["Literature", "CRS", "Government"].includes(s.subject)) art += s.total;
    if (["Economics", "Commerce"].includes(s.subject)) commercial += s.total;
  });

  let recommendation = "Art";
  if (science > art && science > commercial) recommendation = "Science";
  else if (commercial > science && commercial > art) recommendation = "Commercial";

  await AIGuidance.create({
    schoolId: admin.schoolId,
    studentId,
    stage: "JSS3",
    recommendation,
    reasons: ["Based on cumulative subject performance"]
  });

  return NextResponse.json({ recommendation });
}
