import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
import TeacherActivity from "@/app/models/TeacherActivity";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await connectDB();
  const token = req.headers.get("authorization")?.split(" ")[1];
  const teacher: any = verifyToken(token || "");

  if (!teacher || teacher.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const {
    studentId,
    classId,
    subject,
    term,
    classwork,
    test,
    exam
  } = await req.json();

  const total = classwork + test + exam;

  const score = await Score.create({
    schoolId: teacher.schoolId,
    studentId,
    classId,
    subject,
    term,
    classwork,
    test,
    exam,
    total,
    teacherId: teacher.id
  });

  await TeacherActivity.create({
    schoolId: teacher.schoolId,
    teacherId: teacher.id,
    action: "UPLOAD_SCORE"
  });

  return NextResponse.json({ scoreId: score._id });
}
