import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { announcementReads, announcements } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
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

    const body = await req.json();
    const announcementId = String(body?.announcementId || "").trim();
    if (!announcementId) {
      return NextResponse.json({ error: "announcementId is required" }, { status: 400 });
    }

    const targetAnnouncement = await d1
      .select({ id: announcements.id })
      .from(announcements)
      .where(
        and(
          eq(announcements.schoolId, user.schoolId),
          eq(announcements.id, announcementId)
        )
      )
      .limit(1);

    if (!targetAnnouncement[0]) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    const existingReads = await d1
      .select({ id: announcementReads.id })
      .from(announcementReads)
      .where(
        and(
          eq(announcementReads.schoolId, user.schoolId),
          eq(announcementReads.announcementId, announcementId),
          eq(announcementReads.readerId, user.userId)
        )
      )
      .limit(1);

    const now = new Date();
    if (existingReads[0]) {
      await d1
        .update(announcementReads)
        .set({ readAt: now, updatedAt: now })
        .where(eq(announcementReads.id, existingReads[0].id));
    } else {
      await d1.insert(announcementReads).values({
        id: crypto.randomUUID(),
        schoolId: user.schoolId,
        announcementId,
        readerId: user.userId,
        readAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({
      message: "Announcement marked as read",
      announcementId,
      storageMode: "announcement-reads-table",
    });
  } catch (error: unknown) {
    console.error("Mark announcement read error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark announcement as read" },
      { status: 500 }
    );
  }
}