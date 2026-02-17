import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import Score from "@/app/models/Score";
import User from "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

/**
 * Mark Audit Trail API
 * Fetch complete history of mark modifications for compliance & transparency
 * Access: ADMIN only
 */

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("type"); // DAILY_MARKS | SCORE
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100");

    let auditTrail: any[] = [];

    // Build date filter
    const dateFilter: any = {};
    if (startDate)
      dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Fetch Daily Marks audit trail
    if (!filterType || filterType === "DAILY_MARKS") {
      const dailyMarks = await DailyMark.find({
        schoolId: user.schoolId,
        ...(Object.keys(dateFilter).length && {
          lastModifiedDate: dateFilter
        })
      })
        .populate("recordedBy", "fullName email role")
        .populate("lastModifiedBy", "fullName email role")
        .populate("studentId", "name studentId")
        .populate("termId", "name year")
        .lean();

      dailyMarks.forEach((mark: any) => {
        // Add original entry
        auditTrail.push({
          id: mark._id.toString(),
          type: "DAILY_MARK",
          studentId: mark.studentId?._id,
          studentName: mark.studentId?.name,
          studentCode: mark.studentId?.studentId,
          assessmentType: mark.assessmentType,
          score: mark.score,
          recordedBy: mark.recordedBy?.fullName,
          recordedDate: mark.createdAt,
          lastModifiedBy: mark.lastModifiedBy?.fullName,
          lastModifiedDate: mark.lastModifiedDate,
          modificationCount: mark.modificationHistory?.length || 0
        });

        // Add individual modifications
        if (mark.modificationHistory && mark.modificationHistory.length > 0) {
          mark.modificationHistory.forEach((mod: any, idx: number) => {
            auditTrail.push({
              id: `${mark._id}-mod-${idx}`,
              type: "DAILY_MARK_MODIFICATION",
              studentId: mark.studentId?._id,
              studentName: mark.studentId?.name,
              assessmentType: mark.assessmentType,
              field: mod.field,
              oldValue: mod.oldValue,
              newValue: mod.newValue,
              modifiedBy: mod.modifiedBy,
              modifiedDate: mod.modifiedDate,
              reason: mod.reason
            });
          });
        }
      });
    }

    // Fetch Score audit trail
    if (!filterType || filterType === "SCORE") {
      const scores = await Score.find({
        schoolId: user.schoolId,
        ...(Object.keys(dateFilter).length && {
          lastModifiedDate: dateFilter
        })
      })
        .populate("studentId", "name studentId")
        .populate("termId", "name year")
        .populate("subjectId", "name code")
        .lean();

      scores.forEach((score: any) => {
        auditTrail.push({
          id: score._id.toString(),
          type: "SCORE",
          studentId: score.studentId?._id,
          studentName: score.studentId?.name,
          studentCode: score.studentId?.studentId,
          subject: score.subjectId?.name,
          totalScore: score.total,
          grade: score.grade,
          lastModifiedDate: score.lastModifiedDate,
          modificationCount: score.modificationHistory?.length || 0
        });

        // Add modifications
        if (score.modificationHistory && score.modificationHistory.length > 0) {
          score.modificationHistory.forEach((mod: any, idx: number) => {
            auditTrail.push({
              id: `${score._id}-mod-${idx}`,
              type: "SCORE_MODIFICATION",
              studentId: score.studentId?._id,
              studentName: score.studentId?.name,
              subject: score.subjectId?.name,
              field: mod.field,
              oldValue: mod.oldValue,
              newValue: mod.newValue,
              modifiedBy: mod.modifiedBy,
              modifiedDate: mod.modifiedDate,
              reason: mod.reason
            });
          });
        }
      });
    }

    // Sort by date descending and limit
    auditTrail = auditTrail
      .sort(
        (a, b) =>
          new Date(b.modifiedDate || b.lastModifiedDate || b.recordedDate).getTime() -
          new Date(a.modifiedDate || a.lastModifiedDate || a.recordedDate).getTime()
      )
      .slice(0, limit);

    return NextResponse.json({
      total: auditTrail.length,
      filters: {
        type: filterType || "ALL",
        dateRange: startDate && endDate ? `${startDate} to ${endDate}` : "All time"
      },
      auditTrail
    });
  } catch (error: any) {
    console.error("Audit trail fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch audit trail" },
      { status: 500 }
    );
  }
}
