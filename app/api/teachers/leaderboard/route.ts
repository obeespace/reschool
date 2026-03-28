import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { terms } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import { buildTeacherRewardsLeaderboard } from "@/app/utils/teacherRewards";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const termIdQuery = String(searchParams.get("termId") || "").trim();
    const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || 5)));

    const resolvedTermId = termIdQuery
      ? termIdQuery
      : (
          await d1
            .select({ id: terms.id })
            .from(terms)
            .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true)))
            .limit(1)
        )[0]?.id;

    if (!resolvedTermId) {
      return NextResponse.json({ leaderboard: [], termId: null });
    }

    const fullRanked = await buildTeacherRewardsLeaderboard(d1, user.schoolId, resolvedTermId, 1000);
    const ranked = fullRanked.slice(0, limit);
    const self = user.role === "TEACHER"
      ? fullRanked.find((entry) => entry.teacherId === user.userId) || null
      : null;

    return NextResponse.json({
      termId: resolvedTermId,
      leaderboard: ranked,
      self,
      totalTeachersRanked: fullRanked.length,
      scoringModel: {
        period: "term",
        topWinners: 5,
        signals: [
          "daily_marks",
          "attendance_updates",
          "teacher_remarks",
          "announcements",
          "app_activity_events",
          "frequency",
          "timeliness",
          "consistency",
        ],
      },
    });
  } catch (error: unknown) {
    console.error("Teacher leaderboard error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load teacher leaderboard" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}