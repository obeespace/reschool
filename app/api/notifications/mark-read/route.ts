import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { notifications } from "@/app/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || body?.notificationId || "").trim();
    const markAll = body?.markAll === true;

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const now = new Date();
    if (markAll) {
      await d1
        .update(notifications)
        .set({ readAt: now, updatedAt: now })
        .where(
          and(
            eq(notifications.schoolId, user.schoolId),
            eq(notifications.recipientId, user.userId),
            isNull(notifications.readAt)
          )
        );

      return NextResponse.json({ message: "All notifications marked as read" });
    }

    if (!id) {
      return NextResponse.json({ error: "id is required unless markAll=true" }, { status: 400 });
    }

    await d1
      .update(notifications)
      .set({ readAt: now, updatedAt: now })
      .where(and(eq(notifications.id, id), eq(notifications.schoolId, user.schoolId), eq(notifications.recipientId, user.userId)));

    return NextResponse.json({ message: "Notification marked as read" });
  } catch (error: unknown) {
    console.error("Mark notification read error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark notification" },
      { status: 500 }
    );
  }
}