import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { teacherRewardWinners, terms } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import { buildTeacherRewardsLeaderboard } from "@/app/utils/teacherRewards";

type FinalizeBody = {
  termId?: string;
  note?: string;
  forceRecompute?: boolean;
};

async function resolveTermId(schoolId: string, termIdQuery: string | undefined, d1: ReturnType<typeof getOptionalD1Client>) {
  if (!d1) return null;
  if (termIdQuery) {
    const rows = await d1
      .select({ id: terms.id })
      .from(terms)
      .where(and(eq(terms.schoolId, schoolId), eq(terms.id, termIdQuery)))
      .limit(1);
    return rows[0]?.id || null;
  }

  const currentRows = await d1
    .select({ id: terms.id })
    .from(terms)
    .where(and(eq(terms.schoolId, schoolId), eq(terms.isCurrent, true)))
    .limit(1);
  return currentRows[0]?.id || null;
}

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
    const termId = await resolveTermId(user.schoolId, String(searchParams.get("termId") || "").trim() || undefined, d1);
    if (!termId) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    const winners = await d1
      .select()
      .from(teacherRewardWinners)
      .where(and(eq(teacherRewardWinners.schoolId, user.schoolId), eq(teacherRewardWinners.termId, termId)));

    const sorted = winners.sort((a, b) => a.rank - b.rank);

    const self = user.role === "TEACHER"
      ? sorted.find((w) => w.teacherId === user.userId) || null
      : null;

    return NextResponse.json({
      termId,
      winners: sorted,
      finalized: sorted.length > 0,
      self,
    });
  } catch (error: unknown) {
    console.error("Teacher rewards GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch rewards" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const body = (await req.json().catch(() => ({}))) as FinalizeBody;
    const termId = await resolveTermId(admin.schoolId, String(body.termId || "").trim() || undefined, d1);
    if (!termId) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    const existing = await d1
      .select({ id: teacherRewardWinners.id })
      .from(teacherRewardWinners)
      .where(and(eq(teacherRewardWinners.schoolId, admin.schoolId), eq(teacherRewardWinners.termId, termId)));

    if (existing.length > 0 && !body.forceRecompute) {
      return NextResponse.json(
        {
          error: "Winners already finalized for this term",
          hint: "Pass forceRecompute=true to overwrite existing winners",
        },
        { status: 409 }
      );
    }

    const leaderboard = await buildTeacherRewardsLeaderboard(d1, admin.schoolId, termId, 5);

    const now = new Date();
    await d1.transaction(async (tx) => {
      if (existing.length > 0) {
        await tx
          .delete(teacherRewardWinners)
          .where(and(eq(teacherRewardWinners.schoolId, admin.schoolId), eq(teacherRewardWinners.termId, termId)));
      }

      for (const item of leaderboard.slice(0, 5)) {
        await tx.insert(teacherRewardWinners).values({
          id: crypto.randomUUID(),
          schoolId: admin.schoolId,
          termId,
          teacherId: item.teacherId,
          rank: item.rank,
          points: item.points,
          breakdownJson: JSON.stringify(item.breakdown),
          finalizedBy: admin.userId,
          note: body.note ? String(body.note) : null,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    return NextResponse.json({
      message: "Top 5 rewards finalized for term",
      termId,
      winners: leaderboard.slice(0, 5),
      giftedCount: Math.min(5, leaderboard.length),
    });
  } catch (error: unknown) {
    console.error("Teacher rewards POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to finalize rewards" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  return POST(req);
}

export async function PUT(req: Request) {
  return POST(req);
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
