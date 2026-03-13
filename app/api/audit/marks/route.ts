import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs } from "@/app/db/schema";
import { and, desc, eq, like } from "drizzle-orm";

function parseMeta(metaJson: string | null): Record<string, unknown> {
  if (!metaJson) return {};
  try {
    return JSON.parse(metaJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

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

    const rows = await d1
      .select({
        id: auditLogs.id,
        actorId: auditLogs.actorId,
        action: auditLogs.action,
        metaJson: auditLogs.metaJson,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.schoolId, user.schoolId), like(auditLogs.action, "MARK_%")))
      .orderBy(desc(auditLogs.createdAt));

    return NextResponse.json({
      logs: rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        action: row.action,
        meta: parseMeta(row.metaJson),
        createdAt: row.createdAt,
      })),
    });
  } catch (error: unknown) {
    console.error("Fetch mark audit logs error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

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
    const action = String(body?.action || "").trim();
    const meta = body?.meta && typeof body.meta === "object" ? body.meta : {};

    if (!action || !action.startsWith("MARK_")) {
      return NextResponse.json(
        { error: "action is required and must start with MARK_" },
        { status: 400 }
      );
    }

    const now = new Date();
    const id = crypto.randomUUID();

    await d1.insert(auditLogs).values({
      id,
      schoolId: user.schoolId,
      actorId: user.userId,
      action,
      metaJson: JSON.stringify(meta),
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ message: "Audit log recorded", id });
  } catch (error: unknown) {
    console.error("Create mark audit log error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create audit log" },
      { status: 500 }
    );
  }
}