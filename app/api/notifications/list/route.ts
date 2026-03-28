import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { notifications } from "@/app/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 200);

    const baseRows = await d1
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        actionUrl: notifications.actionUrl,
        priority: notifications.priority,
        readAt: notifications.readAt,
        deliveredAt: notifications.deliveredAt,
        createdDate: notifications.createdDate,
      })
      .from(notifications)
      .where(
        unreadOnly
          ? and(
              eq(notifications.schoolId, user.schoolId),
              eq(notifications.recipientId, user.userId),
              isNull(notifications.readAt)
            )
          : and(eq(notifications.schoolId, user.schoolId), eq(notifications.recipientId, user.userId))
      )
      .orderBy(desc(notifications.createdDate))
      .limit(limit);

    return NextResponse.json({ notifications: baseRows });
  } catch (error: unknown) {
    console.error("List notifications error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list notifications" },
      { status: 500 }
    );
  }
}