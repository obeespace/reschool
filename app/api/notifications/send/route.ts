import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { notifications, users } from "@/app/db/schema";
import { and, eq, inArray } from "drizzle-orm";

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

    const body = await req.json();
    const title = String(body?.title || "").trim();
    const message = String(body?.message || "").trim();
    const type = String(body?.type || "GENERAL").trim().toUpperCase();
    const actionUrl = String(body?.actionUrl || "").trim();
    const priority = String(body?.priority || "NORMAL").trim().toUpperCase();
    const recipientRole = String(body?.recipientRole || "").trim().toUpperCase();
    const recipientIds = Array.isArray(body?.recipientIds)
      ? body.recipientIds.map((value: unknown) => String(value || "").trim()).filter(Boolean)
      : [];

    if (!title || !message) {
      return NextResponse.json({ error: "title and message are required" }, { status: 400 });
    }

    let recipients: Array<{ id: string; role: string }> = [];
    if (recipientIds.length > 0) {
      recipients = await d1
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(and(eq(users.schoolId, admin.schoolId), inArray(users.id, recipientIds)));
    } else if (recipientRole) {
      recipients = await d1
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(and(eq(users.schoolId, admin.schoolId), eq(users.role, recipientRole)));
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No matching recipients found" }, { status: 404 });
    }

    const now = new Date();
    await d1.insert(notifications).values(
      recipients.map((recipient) => ({
        id: crypto.randomUUID(),
        schoolId: admin.schoolId,
        recipientId: recipient.id,
        recipientRole: recipient.role,
        type,
        title,
        message,
        actionUrl: actionUrl || null,
        deliveryChannelsJson: '["IN_APP"]',
        deliveredAt: now,
        readAt: null,
        priority,
        createdDate: now,
        createdAt: now,
        updatedAt: now,
      }))
    );

    return NextResponse.json({
      message: "Notifications sent",
      recipients: recipients.length,
    });
  } catch (error: unknown) {
    console.error("Send notification error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send notifications" },
      { status: 500 }
    );
  }
}