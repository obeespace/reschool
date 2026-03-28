import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { certificates } from "@/app/db/schema";
import { eq } from "drizzle-orm";

/**
 * Public endpoint — no auth required.
 * Accepts either ?certificateNumber=... or ?certificateId=...
 * Returns limited public fields only (no internal DB IDs).
 */
export async function GET(req: Request) {
  try {
    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const certificateNumber = String(searchParams.get("certificateNumber") || "").trim();
    const hash = String(searchParams.get("hash") || "").trim();

    if (!certificateNumber && !hash) {
      return NextResponse.json(
        { error: "Provide certificateNumber or hash query parameter" },
        { status: 400 }
      );
    }

    let rows;
    if (certificateNumber) {
      rows = await d1
        .select({
          id: certificates.id,
          studentName: certificates.studentName,
          studentAdmissionNumber: certificates.studentAdmissionNumber,
          classLevel: certificates.classLevel,
          certificateNumber: certificates.certificateNumber,
          graduationYear: certificates.graduationYear,
          issuedDate: certificates.issuedDate,
          signatureApprovalStatus: certificates.signatureApprovalStatus,
          isVerifiable: certificates.isVerifiable,
          digitalHash: certificates.digitalHash,
        })
        .from(certificates)
        .where(eq(certificates.certificateNumber, certificateNumber))
        .limit(1);
    } else {
      rows = await d1
        .select({
          id: certificates.id,
          studentName: certificates.studentName,
          studentAdmissionNumber: certificates.studentAdmissionNumber,
          classLevel: certificates.classLevel,
          certificateNumber: certificates.certificateNumber,
          graduationYear: certificates.graduationYear,
          issuedDate: certificates.issuedDate,
          signatureApprovalStatus: certificates.signatureApprovalStatus,
          isVerifiable: certificates.isVerifiable,
          digitalHash: certificates.digitalHash,
        })
        .from(certificates)
        .where(eq(certificates.digitalHash, hash))
        .limit(1);
    }

    const cert = rows[0];
    if (!cert) {
      return NextResponse.json({ valid: false, error: "Certificate not found" }, { status: 404 });
    }

    if (!cert.isVerifiable) {
      return NextResponse.json({ valid: false, error: "This certificate is not verifiable online" }, { status: 403 });
    }

    const isValid =
      cert.signatureApprovalStatus === "APPROVED" ||
      cert.signatureApprovalStatus === "SIGNED";

    return NextResponse.json({
      valid: isValid,
      certificate: {
        certificateNumber: cert.certificateNumber,
        studentName: cert.studentName,
        admissionNumber: cert.studentAdmissionNumber,
        classLevel: cert.classLevel,
        graduationYear: cert.graduationYear,
        issuedDate: cert.issuedDate,
        approvalStatus: cert.signatureApprovalStatus,
      },
    });
  } catch (error: unknown) {
    console.error("Certificate verify error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify certificate" },
      { status: 500 }
    );
  }
}
