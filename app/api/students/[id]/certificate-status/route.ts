import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { certificates, parentWardLinks, studentLifecycleRecords, students } from "@/app/db/schema";
import { resolveCertificateEligibility } from "@/app/utils/certificateEligibility";
import { and, desc, eq } from "drizzle-orm";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "PARENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const studentId = String(id || "").trim();
    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    if (user.role === "PARENT") {
      const links = await d1
        .select({ id: parentWardLinks.id })
        .from(parentWardLinks)
        .where(
          and(
            eq(parentWardLinks.schoolId, user.schoolId),
            eq(parentWardLinks.parentId, user.userId),
            eq(parentWardLinks.studentId, studentId)
          )
        )
        .limit(1);

      if (!links[0]) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const studentRows = await d1
      .select({ id: students.id, firstName: students.firstName, lastName: students.lastName, admissionNumber: students.admissionNumber })
      .from(students)
      .where(and(eq(students.schoolId, user.schoolId), eq(students.id, studentId)))
      .limit(1);

    if (!studentRows[0]) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const [lifecycleRows, certificateRows] = await Promise.all([
      d1
        .select({
          currentStatus: studentLifecycleRecords.currentStatus,
          certificationStatus: studentLifecycleRecords.certificationStatus,
          graduationDate: studentLifecycleRecords.graduationDate,
          certificateId: studentLifecycleRecords.certificateId,
          withdrawalReason: studentLifecycleRecords.withdrawalReason,
        })
        .from(studentLifecycleRecords)
        .where(
          and(
            eq(studentLifecycleRecords.schoolId, user.schoolId),
            eq(studentLifecycleRecords.studentId, studentId)
          )
        )
        .limit(1),
      d1
        .select()
        .from(certificates)
        .where(and(eq(certificates.schoolId, user.schoolId), eq(certificates.studentId, studentId)))
        .orderBy(desc(certificates.createdAt))
        .limit(1),
    ]);

    const lifecycle = lifecycleRows[0] || null;
    const certificate = certificateRows[0] || null;
    const eligibility = resolveCertificateEligibility(lifecycle);

    return NextResponse.json({
      student: {
        id: studentRows[0].id,
        fullName: `${studentRows[0].firstName} ${studentRows[0].lastName}`.trim(),
        admissionNumber: studentRows[0].admissionNumber,
      },
      lifecycle,
      certificate,
      status: {
        eligible: eligibility.eligible,
        eligibilityCode: eligibility.code,
        eligibilityReason: eligibility.reason,
        hasCertificate: Boolean(certificate),
        signed: certificate?.signatureApprovalStatus === "SIGNED",
      },
    });
  } catch (error: unknown) {
    console.error("Certificate status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch certificate status" },
      { status: 500 }
    );
  }
}