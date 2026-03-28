import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { certificates, studentLifecycleRecords } from "@/app/db/schema";
import { resolveCertificateEligibility } from "@/app/utils/certificateEligibility";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const pending = await d1
      .select()
      .from(certificates)
      .where(and(eq(certificates.schoolId, user.schoolId), eq(certificates.signatureApprovalStatus, "PENDING")));

    return NextResponse.json({ pending });
  } catch (error: unknown) {
    console.error("List pending certificates error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list pending certificates" },
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

    const body = await req.json();
    const certificateId = String(body?.certificateId || "").trim();
    const status = String(body?.status || "SIGNED").trim().toUpperCase();

    if (!certificateId) {
      return NextResponse.json({ error: "certificateId is required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const certRows = await d1
      .select({ id: certificates.id, studentId: certificates.studentId })
      .from(certificates)
      .where(and(eq(certificates.schoolId, admin.schoolId), eq(certificates.id, certificateId)))
      .limit(1);

    if (!certRows[0]) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    const lifecycleRows = await d1
      .select({
        id: studentLifecycleRecords.id,
        currentStatus: studentLifecycleRecords.currentStatus,
        certificationStatus: studentLifecycleRecords.certificationStatus,
        graduationDate: studentLifecycleRecords.graduationDate,
        withdrawalReason: studentLifecycleRecords.withdrawalReason,
      })
      .from(studentLifecycleRecords)
      .where(
        and(
          eq(studentLifecycleRecords.schoolId, admin.schoolId),
          eq(studentLifecycleRecords.studentId, certRows[0].studentId)
        )
      )
      .limit(1);

    const eligibility = resolveCertificateEligibility(lifecycleRows[0]);
    if (!eligibility.eligible) {
      return NextResponse.json({ error: eligibility.reason, eligibility }, { status: 400 });
    }

    const now = new Date();
    await d1
      .update(certificates)
      .set({
        signatureApprovalStatus: status,
        signedByPrincipalId: admin.userId,
        signedByPrincipalName: admin.fullName,
        signatureDate: now,
        issuedDate: status === "SIGNED" ? now : null,
        updatedAt: now,
      })
      .where(eq(certificates.id, certificateId));

    if (lifecycleRows[0]) {
      await d1
        .update(studentLifecycleRecords)
        .set({
          certificateId,
          certificationStatus: status === "SIGNED" ? "COMPLETED" : "PENDING",
          updatedAt: now,
        })
        .where(eq(studentLifecycleRecords.id, lifecycleRows[0].id));
    }

    return NextResponse.json({ message: "Certificate status updated", status, eligibility });
  } catch (error: unknown) {
    console.error("Sign certificate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sign certificate" },
      { status: 500 }
    );
  }
}