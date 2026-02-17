import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import { verifyToken } from "@/app/utils/auth";
import { checkTermAccess } from "@/app/utils/termGuard";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user || user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { studentId, subjectId, classId, termId, assessmentType, score, maxScore, feedbackNotes, academicYearId } = await req.json();

    if (!studentId || !subjectId || !classId || !termId || !assessmentType || score === undefined || !academicYearId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ← NEW: Check term payment access
    try {
      await checkTermAccess(user.schoolId, termId);
    } catch (error: any) {
      return NextResponse.json(
        { error: "This term is not paid or is closed. Cannot record marks." },
        { status: 402 } // Payment Required
      );
    }

    if (!["CLASSWORK", "HOMEWORK", "EVALUATION", "EXAM"].includes(assessmentType)) {
      return NextResponse.json(
        { error: "Invalid assessment type" },
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
      assessmentType,
      score,
      maxScore: maxScore || 10,
      feedbackNotes,
      recordedDate: new Date(),
      recordedBy: user.userId,
      academicYearId,
      termId,
      modificationHistory: []
    });

    return NextResponse.json({
      message: "Daily mark recorded successfully",
      dailyMark: {
        id: dailyMark._id.toString(),
        studentId,
        score,
        assessmentType
      }
    });

  } catch (error: any) {
    console.error("Error recording daily mark:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record daily mark" },
      { status: 500 }
    );
  }
}
