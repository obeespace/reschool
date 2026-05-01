import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs, certificates } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import { getParentWardData } from "@/app/utils/schoolRelationships";

type ReprintHistoryItem = {
  actorId: string;
  actorRole: string;
  timestamp: string;
  reason: string;
};

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "ADMIN" && user.role !== "PARENT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const certificateId = String(body?.certificateId || "").trim();
    const reason = String(body?.reason || "Reprint requested").trim();

    if (!certificateId) {
      return NextResponse.json({ error: "certificateId is required" }, { status: 400 });
    }

    const rows = await d1
      .select({
        id: certificates.id,
        studentId: certificates.studentId,
        reprintCount: certificates.reprintCount,
        reprintHistoryJson: certificates.reprintHistoryJson,
        signatureApprovalStatus: certificates.signatureApprovalStatus,
      })
      .from(certificates)
      .where(and(eq(certificates.id, certificateId), eq(certificates.schoolId, user.schoolId)))
      .limit(1);

    const cert = rows[0];
    if (!cert) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    if (cert.signatureApprovalStatus !== "APPROVED" && cert.signatureApprovalStatus !== "SIGNED") {
      return NextResponse.json({ error: "Certificate is not yet signed/approved" }, { status: 400 });
    }

    if (user.role === "PARENT") {
      const wards = await getParentWardData(d1, user.schoolId, user.userId);
      const allowed = wards.some((w) => w.id === cert.studentId);
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const now = new Date();
    let history: ReprintHistoryItem[] = [];
    try {
      const parsed = JSON.parse(cert.reprintHistoryJson || "[]");
      history = Array.isArray(parsed) ? parsed : [];
    } catch {
      history = [];
    }

    history.push({
      actorId: user.userId,
      actorRole: user.role,
      timestamp: now.toISOString(),
      reason,
    });

    const nextReprintCount = Number(cert.reprintCount || 0) + 1;
    await d1
      .update(certificates)
      .set({
        reprintCount: nextReprintCount,
        reprintHistoryJson: JSON.stringify(history),
        updatedAt: now,
      })
      .where(eq(certificates.id, certificateId));

    await d1.insert(auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: user.schoolId,
      actorId: user.userId,
      action: "CERTIFICATE_REPRINT",
      metaJson: JSON.stringify({ certificateId, reprintCount: nextReprintCount, reason }),
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      message: "Certificate reprint recorded",
      certificateId,
      reprintCount: nextReprintCount,
    });
  } catch (error: unknown) {
    console.error("Certificate reprint error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record reprint" },
      { status: 500 }
    );
  }
}
