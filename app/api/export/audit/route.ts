import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs, users } from "@/app/db/schema";
import { desc, eq } from "drizzle-orm";

type AuditExportRow = {
  id: string;
  createdAt: Date | null;
  actorId: string | null;
  actorName: string;
  action: string;
  metaJson: string;
};

function buildCsv(rows: AuditExportRow[]): string {
  const header = ["Audit ID", "Created At", "Actor ID", "Actor Name", "Action", "Meta JSON"];
  const data = rows.map((row) =>
    [
      row.id,
      row.createdAt ? row.createdAt.toISOString() : "",
      row.actorId || "",
      row.actorName,
      row.action,
      row.metaJson,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...data].join("\n");
}

async function handleExport(req: Request, payload: { action?: string; from?: string; to?: string; includeAnnouncements?: boolean; format?: string }) {
  const token = req.headers.get("authorization")?.split(" ")[1];
  const admin: ITokenPayload | null = verifyToken(token || "");

  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const d1 = getOptionalD1Client();
  if (!d1) {
    return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
  }

  const actionFilter = String(payload.action || "").trim().toUpperCase();
  const fromTs = payload.from ? Number(new Date(payload.from)) : 0;
  const toTs = payload.to ? Number(new Date(payload.to)) : 0;
  const includeAnnouncements = payload.includeAnnouncements === true;

  const rows = await d1
    .select({
      id: auditLogs.id,
      createdAt: auditLogs.createdAt,
      actorId: auditLogs.actorId,
      action: auditLogs.action,
      metaJson: auditLogs.metaJson,
      actorName: users.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .where(eq(auditLogs.schoolId, admin.schoolId))
    .orderBy(desc(auditLogs.createdAt));

  const exportRows: AuditExportRow[] = rows
    .filter((row) => {
      if (!includeAnnouncements && row.action.startsWith("ANNOUNCEMENT_")) return false;
      if (actionFilter && row.action !== actionFilter) return false;
      const createdAtMs = row.createdAt ? new Date(row.createdAt).getTime() : 0;
      if (fromTs && createdAtMs < fromTs) return false;
      if (toTs && createdAtMs > toTs) return false;
      return true;
    })
    .map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      actorId: row.actorId,
      actorName: row.actorName || "Unknown User",
      action: row.action,
      metaJson: row.metaJson || "{}",
    }));

  const format = String(payload.format || "json").trim().toLowerCase();
  if (format === "csv") {
    return new NextResponse(buildCsv(exportRows), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"audit-export.csv\"",
      },
    });
  }

  return NextResponse.json({ count: exportRows.length, logs: exportRows });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    return await handleExport(req, {
      action: searchParams.get("action") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      includeAnnouncements: searchParams.get("includeAnnouncements") === "true",
      format: searchParams.get("format") || undefined,
    });
  } catch (error: unknown) {
    console.error("Audit export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export audit logs" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return await handleExport(req, {
      action: String(body?.action || "").trim() || undefined,
      from: String(body?.from || "").trim() || undefined,
      to: String(body?.to || "").trim() || undefined,
      includeAnnouncements: body?.includeAnnouncements === true,
      format: String(body?.format || "").trim() || undefined,
    });
  } catch (error: unknown) {
    console.error("Audit export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export audit logs" },
      { status: 500 }
    );
  }
}