import connectDB from "@/app/utils/db";
import TeacherActivity from "@/app/models/TeacherActivity";
import User from "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

/**
 * Teacher Rewards Leaderboard
 * Weighted scoring system to identify top 10 most active & impactful teachers
 */

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Weight system for activities
    const activityWeights: Record<string, number> = {
      UPLOAD_SCORE: 5,
      POST_ANNOUNCEMENT: 2,
      STUDENT_FEEDBACK: 3,
      MARK_ENTRY: 5,
      ATTENDANCE_MARK: 1
    };

    // Get all teacher activities (current month for anti-gaming)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const activities = await TeacherActivity.find({
      schoolId: user.schoolId,
      createdAt: { $gte: startOfMonth }
    });

    // Calculate weighted scores
    const teacherScores: Record<
      string,
      {
        teacherId: string;
        totalPoints: number;
        activityCount: number;
        breakdown: Record<string, number>;
      }
    > = {};

    activities.forEach((activity: any) => {
      const teacherId = activity.teacherId.toString();
      const weight = activityWeights[activity.action] || 0;

      if (!teacherScores[teacherId]) {
        teacherScores[teacherId] = {
          teacherId,
          totalPoints: 0,
          activityCount: 0,
          breakdown: {}
        };
      }

      teacherScores[teacherId].totalPoints += weight;
      teacherScores[teacherId].activityCount += 1;
      teacherScores[teacherId].breakdown[activity.action] =
        (teacherScores[teacherId].breakdown[activity.action] || 0) + weight;
    });

    // Convert to array and sort
    const leaderboard = Object.values(teacherScores)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 10); // Top 10

    // Enrich with teacher names
    const enrichedLeaderboard = await Promise.all(
      leaderboard.map(async (entry) => {
        const teacher = await User.findOne({
          _id: entry.teacherId,
          schoolId: user.schoolId
        }).select("fullName email");

        return {
          rank: leaderboard.indexOf(entry) + 1,
          teacherId: entry.teacherId,
          teacherName: teacher?.fullName || "Unknown",
          totalPoints: entry.totalPoints,
          activityCount: entry.activityCount,
          averagePointsPerActivity: (
            entry.totalPoints / entry.activityCount
          ).toFixed(2),
          breakdown: entry.breakdown,
          badge:
            entry.totalPoints >= 100
              ? "⭐ Excellence"
              : entry.totalPoints >= 50
                ? "🌟 High Performer"
                : entry.totalPoints >= 20
                  ? "👍 Active"
                  : "📊 Participant"
        };
      })
    );

    return NextResponse.json({
      period: `${startOfMonth.toLocaleDateString()} - Today`,
      totalTeachers: Object.keys(teacherScores).length,
      weightSystem: activityWeights,
      leaderboard: enrichedLeaderboard
    });
  } catch (error: any) {
    console.error("Fetch leaderboard error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}

