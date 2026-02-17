import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

/**
 * Edit Daily Mark with Audit Trail
 * Updates a daily mark and tracks all modifications
 * Access: TEACHER (own marks) or ADMIN
 */

export async function PUT(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const {
      markId,
      newScore,
      newFeedback,
      reason // Required: why this mark is being edited
    } = body;

    if (!markId || newScore === undefined || !reason) {
      return NextResponse.json(
        { error: "markId, newScore, and reason are required" },
        { status: 400 }
      );
    }

    // Fetch existing mark
    const existingMark = await DailyMark.findOne({
      _id: markId,
      schoolId: user.schoolId
    });

    if (!existingMark) {
      return NextResponse.json(
        { error: "Daily mark not found" },
        { status: 404 }
      );
    }

    // Access control: teacher can only edit own marks, admin can edit any
    if (
      user.role === "TEACHER" &&
      existingMark.recordedBy.toString() !== user.id
    ) {
      return NextResponse.json(
        { error: "Cannot edit another teacher's marks" },
        { status: 403 }
      );
    }

    // Validate score range
    if (newScore < 0 || newScore > 100) {
      return NextResponse.json(
        {
          error: "Score must be between 0 and 100"
        },
        { status: 400 }
      );
    }

    // Build modification history entry
    const modifications = existingMark.modificationHistory || [];

    if (existingMark.score !== newScore) {
      modifications.push({
        field: "score",
        oldValue: existingMark.score,
        newValue: newScore,
        modifiedBy: user.id,
        modifiedDate: new Date(),
        reason: reason
      });
    }

    if (newFeedback && existingMark.feedbackNotes !== newFeedback) {
      modifications.push({
        field: "feedbackNotes",
        oldValue: existingMark.feedbackNotes || "None",
        newValue: newFeedback,
        modifiedBy: user.id,
        modifiedDate: new Date(),
        reason: reason
      });
    }

    // Update mark
    const updatedMark = await DailyMark.findByIdAndUpdate(
      markId,
      {
        score: newScore,
        feedbackNotes: newFeedback || existingMark.feedbackNotes,
        modificationHistory: modifications,
        lastModifiedBy: user.id,
        lastModifiedDate: new Date()
      },
      { new: true }
    )
      .populate("studentId", "name studentId")
      .populate("termId", "name year");

    return NextResponse.json({
      message: "Mark updated successfully",
      mark: {
        id: updatedMark._id,
        studentId: updatedMark.studentId?._id,
        studentName: updatedMark.studentId?.name,
        assessmentType: updatedMark.assessmentType,
        oldScore: existingMark.score,
        newScore: updatedMark.score,
        feedback: updatedMark.feedbackNotes,
        modifiedDate: updatedMark.lastModifiedDate,
        totalModifications: modifications.length
      }
    });
  } catch (error: any) {
    console.error("Update daily mark error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update mark" },
      { status: 500 }
    );
  }
}
