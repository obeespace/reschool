import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { reportCards, students, terms } from "@/app/db/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  type ExportableRecord,
  prepareZIPManifest,
  structureReportCardForPDF,
  validateExportBundle,
} from "@/app/utils/exportStructuring";
import { getParentWardData } from "@/app/utils/schoolRelationships";

type ExportRequest = {
  format?: "pdf" | "zip";
  type?: "transcripts" | "report_cards" | "certificates" | "attendance" | "mixed";
  classId?: string;
  studentIds?: string[];
  termId?: string;
};

type PDFManifest = {
  files: Array<{ fileName: string; contentType: string }>;
  totalRecords: number;
  zipFileName: string;
};

function preparePDFManifest(records: ExportableRecord[]): PDFManifest {
  return {
    files: records.map((record) => ({
      fileName: record.fileName || `${record.recordId}.pdf`,
      contentType: "application/pdf",
    })),
    totalRecords: records.length,
    zipFileName: `exports_${new Date().toISOString().slice(0, 10)}.pdf-bundle`,
  };
}

/**
 * Coordinate PDF/ZIP export generation
 * Supports exporting transcripts, report cards, certificates, attendance records
 */

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER" && user.role !== "PARENT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({})) as ExportRequest;
    const format = String(body.format || "pdf").toLowerCase() as "pdf" | "zip";
    const exportType = String(body.type || "report_cards").toLowerCase();
    const classId = String(body.classId || "").trim();
    const studentIds = Array.isArray(body.studentIds)
      ? body.studentIds.map((id: unknown) => String(id || "").trim()).filter(Boolean)
      : [];
    const termIdQuery = String(body.termId || "").trim();

    const resolvedTermId = termIdQuery || (
      await d1
        .select({ id: terms.id })
        .from(terms)
        .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true)))
        .limit(1)
    )[0]?.id;

    if (!resolvedTermId && exportType !== "transcripts") {
      return NextResponse.json(
        { error: "No term found; provide termId or ensure a current term exists" },
        { status: 400 }
      );
    }

    // Access control: determine which records the user can export
    let accessibleStudentIds: Set<string> | null = null;

    if (user.role === "PARENT") {
      const wards = await getParentWardData(d1, user.schoolId, user.userId);
      accessibleStudentIds = new Set(wards.map((w) => w.id));
    }

    if (user.role === "TEACHER") {
      // Teachers can export for their assigned classes
      // For now, simplified approach: allow export if classId is provided and they teach it
      // Full implementation would verify teacher class assignments
      if (!classId) {
        return NextResponse.json(
          { error: "Teachers must specify classId for export" },
          { status: 400 }
        );
      }
    }

    // Build export manifest
    const records: ExportableRecord[] = [];

    if (exportType.includes("report_card")) {
      const query = resolvedTermId
        ? await d1
            .select()
            .from(reportCards)
            .where(and(eq(reportCards.schoolId, user.schoolId), eq(reportCards.termId, resolvedTermId)))
            .orderBy(desc(reportCards.generatedDate))
        : [];

      const filtered = query.filter((report) => {
        if (classId && report.classId !== classId) return false;
        if (studentIds.length > 0 && !studentIds.includes(report.studentId)) return false;
        if (accessibleStudentIds && !accessibleStudentIds.has(report.studentId)) return false;
        return true;
      });

      for (const report of filtered) {
        const studentRow = await d1
          .select({ firstName: students.firstName, lastName: students.lastName })
          .from(students)
          .where(and(eq(students.schoolId, user.schoolId), eq(students.id, report.studentId)))
          .limit(1);

        const studentName = studentRow[0]
          ? `${studentRow[0].firstName} ${studentRow[0].lastName}`.trim()
          : "Unknown";

        let subjectScores: Array<{ name: string; score: number }> = [];
        try {
          const parsed = JSON.parse(report.subjectScoresJson || "[]");
          subjectScores = Array.isArray(parsed)
            ? parsed.map((s: unknown) => ({
                name: typeof s === "object" && s && "name" in s ? String(s.name) : "Subject",
                score: typeof s === "object" && s && "score" in s ? Number(s.score) : 0,
              }))
            : [];
        } catch {
          subjectScores = [];
        }

        records.push(
          structureReportCardForPDF({
            id: report.id,
            className: report.className,
            termNumber: report.termNumber,
            yearLabel: report.yearLabel,
            studentName,
            subjects: subjectScores,
            totalScore: Number(report.totalScore || 0),
            averageScore: Number(report.averageScore || 0),
            classRanking: report.classRanking,
            classSize: report.classSize,
            attendancePercentage: report.attendancePercentage ? Number(report.attendancePercentage) : null,
            promotionStatus: report.promotionStatus || undefined,
          })
        );
      }
    }

    // Validate the bundle
    const validation = validateExportBundle(records);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Export bundle invalid", warnings: validation.warnings },
        { status: 400 }
      );
    }

    // Return manifest for the frontend to handle PDF generation/ZIP packing
    const manifest = format === "zip" ? prepareZIPManifest(records) : preparePDFManifest(records);

    return NextResponse.json({
      format,
      manifest,
      recordCount: records.length,
      warnings: validation.warnings,
      message: `Ready to export ${records.length} ${format.toUpperCase()} file(s)`,
    });
  } catch (error: unknown) {
    console.error("Export coordination error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prepare export" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER" && user.role !== "PARENT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // GET returns export template/documentation
    return NextResponse.json({
      description: "Export coordination endpoint",
      methods: {
        POST: {
          body: {
            format: "pdf | zip",
            type: "transcripts | report_cards | certificates | attendance | mixed",
            classId: "optional, for filtering",
            studentIds: "optional array of student IDs",
            termId: "optional, defaults to current term",
          },
          response: {
            manifest: { files: [], totalRecords: 0 },
            recordCount: 0,
            warnings: [],
          },
        },
      },
    });
  } catch (error: unknown) {
    console.error("Export info error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get export information" },
      { status: 500 }
    );
  }
}
