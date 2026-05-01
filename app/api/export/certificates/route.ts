import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { certificates } from "@/app/db/schema";
import { desc, eq } from "drizzle-orm";

type CertificateExportRow = {
  certificateId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classLevel: string;
  certificateNumber: string;
  status: string;
  graduationYear: number | null;
  issuedDate: Date | null;
  signedBy: string;
};

function buildCsv(rows: CertificateExportRow[]): string {
  const header = [
    "Certificate ID",
    "Student ID",
    "Student Name",
    "Admission Number",
    "Class Level",
    "Certificate Number",
    "Status",
    "Graduation Year",
    "Issued Date",
    "Signed By",
  ];

  const data = rows.map((row) =>
    [
      row.certificateId,
      row.studentId,
      row.studentName,
      row.admissionNumber,
      row.classLevel,
      row.certificateNumber,
      row.status,
      row.graduationYear == null ? "" : String(row.graduationYear),
      row.issuedDate ? row.issuedDate.toISOString() : "",
      row.signedBy,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );

  return [header.join(","), ...data].join("\n");
}

async function handleExport(req: Request, payload: { studentId?: string; status?: string; format?: string }) {
  const token = req.headers.get("authorization")?.split(" ")[1];
  const admin: ITokenPayload | null = verifyToken(token || "");

  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const d1 = getOptionalD1Client();
  if (!d1) {
    return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
  }

  const studentId = String(payload.studentId || "").trim();
  const status = String(payload.status || "").trim().toUpperCase();

  const rows = await d1
    .select({
      id: certificates.id,
      studentId: certificates.studentId,
      studentName: certificates.studentName,
      studentAdmissionNumber: certificates.studentAdmissionNumber,
      classLevel: certificates.classLevel,
      certificateNumber: certificates.certificateNumber,
      signatureApprovalStatus: certificates.signatureApprovalStatus,
      graduationYear: certificates.graduationYear,
      issuedDate: certificates.issuedDate,
      signedByPrincipalName: certificates.signedByPrincipalName,
    })
    .from(certificates)
    .where(eq(certificates.schoolId, admin.schoolId))
    .orderBy(desc(certificates.createdAt));

  const filtered = rows.filter((row) => {
    if (studentId && row.studentId !== studentId) return false;
    if (status && String(row.signatureApprovalStatus || "").toUpperCase() !== status) return false;
    return true;
  });

  const exportRows: CertificateExportRow[] = filtered.map((row) => ({
    certificateId: row.id,
    studentId: row.studentId,
    studentName: row.studentName,
    admissionNumber: row.studentAdmissionNumber,
    classLevel: row.classLevel,
    certificateNumber: row.certificateNumber,
    status: row.signatureApprovalStatus,
    graduationYear: row.graduationYear,
    issuedDate: row.issuedDate,
    signedBy: row.signedByPrincipalName || "",
  }));

  const format = String(payload.format || "json").trim().toLowerCase();
  if (format === "csv") {
    return new NextResponse(buildCsv(exportRows), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"certificates-export.csv\"",
      },
    });
  }

  return NextResponse.json({
    count: exportRows.length,
    certificates: exportRows,
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    return await handleExport(req, {
      studentId: searchParams.get("studentId") || undefined,
      status: searchParams.get("status") || undefined,
      format: searchParams.get("format") || undefined,
    });
  } catch (error: unknown) {
    console.error("Certificate export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export certificates" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return await handleExport(req, {
      studentId: String(body?.studentId || "").trim() || undefined,
      status: String(body?.status || "").trim() || undefined,
      format: String(body?.format || "").trim() || undefined,
    });
  } catch (error: unknown) {
    console.error("Certificate export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export certificates" },
      { status: 500 }
    );
  }
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}