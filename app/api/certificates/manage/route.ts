import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { certificates, studentLifecycleRecords, students } from "@/app/db/schema";
import { resolveCertificateEligibility } from "@/app/utils/certificateEligibility";
import { and, desc, eq, inArray } from "drizzle-orm";

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

    const { searchParams } = new URL(req.url);
    const studentId = String(searchParams.get("studentId") || "").trim();
    const status = String(searchParams.get("status") || "").trim().toUpperCase();

    const rows = await d1
      .select()
      .from(certificates)
      .where(eq(certificates.schoolId, user.schoolId))
      .orderBy(desc(certificates.createdAt));

    const lifecycleRows = rows.length
      ? await d1
          .select({
            studentId: studentLifecycleRecords.studentId,
            currentStatus: studentLifecycleRecords.currentStatus,
            certificationStatus: studentLifecycleRecords.certificationStatus,
            graduationDate: studentLifecycleRecords.graduationDate,
            withdrawalReason: studentLifecycleRecords.withdrawalReason,
          })
          .from(studentLifecycleRecords)
          .where(
            and(
              eq(studentLifecycleRecords.schoolId, user.schoolId),
              inArray(studentLifecycleRecords.studentId, [...new Set(rows.map((row) => row.studentId))])
            )
          )
      : [];

    const lifecycleByStudent = new Map(lifecycleRows.map((row) => [row.studentId, row]));

    const filtered = rows.filter((row) => {
      if (studentId && row.studentId !== studentId) return false;
      if (status && row.signatureApprovalStatus !== status) return false;
      return true;
    });

    return NextResponse.json({
      certificates: filtered.map((row) => ({
        ...row,
        eligibility: resolveCertificateEligibility(lifecycleByStudent.get(row.studentId)),
      })),
    });
  } catch (error: unknown) {
    console.error("List certificates error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list certificates" },
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
    const studentId = String(body?.studentId || "").trim();
    const classLevel = String(body?.classLevel || "").trim();
    const graduationYear = Number(body?.graduationYear || new Date().getFullYear());

    if (!studentId || !classLevel) {
      return NextResponse.json({ error: "studentId and classLevel are required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const studentRows = await d1
      .select({
        id: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        admissionNumber: students.admissionNumber,
      })
      .from(students)
      .where(and(eq(students.schoolId, admin.schoolId), eq(students.id, studentId)))
      .limit(1);

    if (!studentRows[0]) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const fullName = `${studentRows[0].firstName} ${studentRows[0].lastName}`.trim();
    const now = new Date();
    const certificateNumber = String(body?.certificateNumber || `${graduationYear}-${studentRows[0].admissionNumber}`).trim();

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
          eq(studentLifecycleRecords.studentId, studentId)
        )
      )
      .limit(1);

    const eligibility = resolveCertificateEligibility(lifecycleRows[0]);

    const existing = await d1
      .select({ id: certificates.id })
      .from(certificates)
      .where(and(eq(certificates.schoolId, admin.schoolId), eq(certificates.studentId, studentId)))
      .limit(1);

    if (!existing[0] && !eligibility.eligible) {
      return NextResponse.json(
        { error: eligibility.reason, eligibility },
        { status: 400 }
      );
    }

    let certificateId = existing[0]?.id || "";
    if (existing[0]) {
      await d1
        .update(certificates)
        .set({
          studentName: fullName,
          studentAdmissionNumber: studentRows[0].admissionNumber,
          admissionYear: Number(body?.admissionYear || null),
          graduationYear,
          classLevel,
          certificateNumber,
          signatureApprovalStatus: String(body?.signatureApprovalStatus || "PENDING").toUpperCase(),
          digitalHash: body?.digitalHash ? String(body.digitalHash) : null,
          qrCode: body?.qrCode ? String(body.qrCode) : null,
          isVerifiable: body?.isVerifiable === true,
          updatedAt: now,
        })
        .where(eq(certificates.id, existing[0].id));
      certificateId = existing[0].id;
    } else {
      const created = await d1
        .insert(certificates)
        .values({
          id: crypto.randomUUID(),
          schoolId: admin.schoolId,
          studentId,
          studentName: fullName,
          studentAdmissionNumber: studentRows[0].admissionNumber,
          admissionYear: Number(body?.admissionYear || null),
          graduationYear,
          classLevel,
          certificateNumber,
          issuedDate: null,
          signatureApprovalStatus: String(body?.signatureApprovalStatus || "PENDING").toUpperCase(),
          signedByPrincipalId: null,
          signedByPrincipalName: null,
          signatureDate: null,
          reprintCount: 0,
          reprintHistoryJson: "[]",
          digitalHash: body?.digitalHash ? String(body.digitalHash) : null,
          qrCode: body?.qrCode ? String(body.qrCode) : null,
          isVerifiable: body?.isVerifiable === true,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: certificates.id });
      certificateId = created[0]?.id || "";
    }

    if (certificateId) {
      if (lifecycleRows[0]) {
        await d1
          .update(studentLifecycleRecords)
          .set({
            certificateId,
            certificationStatus: "IN_PROGRESS",
            updatedAt: now,
          })
          .where(eq(studentLifecycleRecords.id, lifecycleRows[0].id));
      }
    }

    return NextResponse.json({ message: "Certificate saved", certificateId, eligibility });
  } catch (error: unknown) {
    console.error("Manage certificate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save certificate" },
      { status: 500 }
    );
  }
}