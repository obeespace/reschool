import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user || user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { studentId, subjectId, classId, type, score, maxScore, notes, academicYearId } = await req.json();

    if (!studentId || !subjectId || !classId || !type || score === undefined || !academicYearId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["classwork", "homework", "test", "extracurricular"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid mark type" },
        { status: 400 }
      );
    }

    if (score < 0 || score > 100) {
      return NextResponse.json(
        { error: "Score must be between 0 and 100" },
        { status: 400 }
      );
    }

    const dailyMark = await DailyMark.create({
      schoolId: user.schoolId,
      studentId,
      subjectId,
      classId,
      teacherId: user.userId,
      type,
      score,
      maxScore: maxScore || 10,
      notes,
      academicYearId,
      date: new Date()
    });

    return NextResponse.json({
      message: "Daily mark recorded successfully",
      dailyMark
    });

  } catch (error: any) {
    console.error("Error recording daily mark:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record daily mark" },
      { status: 500 }
    );
  }
}
