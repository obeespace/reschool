/**
 * PDF and ZIP export utilities
 *
 * Provides infrastructure for generating PDF transcripts, certificates,
 * and packaging multiple exports into a single ZIP file.
 *
 * Note: Actual PDF rendering requires a library like puppeteer or wkhtmltopdf.
 * This module provides the data structuring and file management layer.
 */

export type PDFExportResult = {
  success: boolean;
  fileName: string;
  mimeType: string;
  data?: ArrayBuffer;
  error?: string;
};

export type ZIPExportResult = {
  success: boolean;
  fileName: string;
  mimeType: "application/zip";
  data?: ArrayBuffer;
  fileCount: number;
  totalSizeBytes: number;
  error?: string;
};

export type ExportableRecord = {
  type: "transcript" | "certificate" | "report_card" | "attendance";
  recordId: string;
  studentId?: string;
  studentName?: string;
  fileName?: string;
  content: unknown; // JSON structure ready for rendering
};

/**
 * Structure transcript data for PDF rendering
 */
export function structureTranscriptForPDF(transcript: {
  student: { fullName: string; admissionNumber: string; id: string };
  entries: Array<{
    sessionId: string;
    termId: string;
    termNumber: number;
    yearLabel: string;
    className?: string;
    subjects: Array<{ subjectName?: string; name?: string; total?: number; score?: number }>;
    totalScore: number;
    averageScore: number;
    classRanking?: number | null;
    classSize?: number | null;
  }>;
}): ExportableRecord {
  return {
    type: "transcript",
    recordId: `transcript_${transcript.student.id}`,
    studentId: transcript.student.id,
    studentName: transcript.student.fullName,
    fileName: `${transcript.student.admissionNumber}_transcript.pdf`,
    content: {
      studentName: transcript.student.fullName,
      admissionNumber: transcript.student.admissionNumber,
      entries: transcript.entries.map((entry) => ({
        session: entry.yearLabel,
        term: entry.termNumber,
        class: entry.className || "N/A",
        subjects: entry.subjects.map((s) => ({
          name: s.subjectName || s.name || "Unknown",
          score: s.total ?? s.score ?? 0,
        })),
        average: entry.averageScore.toFixed(2),
        rank: entry.classRanking ? `${entry.classRanking}/${entry.classSize || "-"}` : "N/A",
      })),
      generatedDate: new Date().toLocaleDateString(),
    },
  };
}

/**
 * Structure certificate data for PDF rendering
 */
export function structureCertificateForPDF(cert: {
  id: string;
  studentName: string;
  studentAdmissionNumber: string;
  classLevel: string;
  certificateNumber: string;
  graduationYear?: number;
  issuedDate?: Date;
}): ExportableRecord {
  return {
    type: "certificate",
    recordId: cert.id,
    studentName: cert.studentName,
    fileName: `Certificate_${cert.certificateNumber}.pdf`,
    content: {
      title: "Graduation Certificate",
      certNumber: cert.certificateNumber,
      studentName: cert.studentName,
      admissionNumber: cert.studentAdmissionNumber,
      level: cert.classLevel,
      graduationYear: cert.graduationYear || new Date().getFullYear(),
      issuedDate: cert.issuedDate ? cert.issuedDate.toLocaleDateString() : new Date().toLocaleDateString(),
      signatureArea: "Principal Signature: _____________________",
    },
  };
}

/**
 * Structure report card data for PDF rendering
 */
export function structureReportCardForPDF(report: {
  id: string;
  className: string;
  termNumber: number;
  yearLabel: string;
  studentName?: string;
  subjects: Array<{ name: string; score: number }>;
  totalScore: number;
  averageScore: number;
  classRanking?: number | null;
  classSize?: number | null;
  attendancePercentage?: number | null;
  promotionStatus?: string;
}): ExportableRecord {
  return {
    type: "report_card",
    recordId: report.id,
    studentName: report.studentName,
    fileName: `ReportCard_${report.yearLabel}_T${report.termNumber}.pdf`,
    content: {
      student: report.studentName || "N/A",
      class: report.className,
      term: report.termNumber,
      session: report.yearLabel,
      subjects: report.subjects.map((s) => ({
        name: s.name,
        score: s.score.toFixed(2),
      })),
      totalScore: report.totalScore.toFixed(2),
      averageScore: report.averageScore.toFixed(2),
      classRank: report.classRanking ? `${report.classRanking} of ${report.classSize || "-"}` : "N/A",
      attendance: report.attendancePercentage ? `${report.attendancePercentage.toFixed(2)}%` : "N/A",
      promotionStatus: report.promotionStatus || "N/A",
      generatedDate: new Date().toLocaleDateString(),
    },
  };
}

/**
 * Structure attendance data for PDF rendering
 */
export function structureAttendanceForPDF(data: {
  studentName?: string;
  className: string;
  termNumber: number;
  records: Array<{ date: Date; status: string }>;
  presentCount: number;
  absentCount: number;
  totalDays: number;
}): ExportableRecord {
  const percentage = data.totalDays > 0 ? ((data.presentCount / data.totalDays) * 100).toFixed(2) : "0.00";
  return {
    type: "attendance",
    recordId: `attendance_${data.studentName}_${data.termNumber}`,
    studentName: data.studentName,
    fileName: `Attendance_${data.className}_T${data.termNumber}.pdf`,
    content: {
      student: data.studentName || "N/A",
      class: data.className,
      term: data.termNumber,
      presentCount: data.presentCount,
      absentCount: data.absentCount,
      totalDays: data.totalDays,
      attendancePercentage: percentage,
      records: data.records.map((r) => ({
        date: r.date.toLocaleDateString(),
        status: r.status,
      })),
    },
  };
}

/**
 * Estimate file size for a set of records
 * Used to warn if ZIP would exceed limits
 */
export function estimateExportSize(records: ExportableRecord[]): number {
  // Rough estimate: each record ~50KB when rendered
  return records.length * 50 * 1024;
}

/**
 * Validate exports are safe to bundle before rendering
 */
export function validateExportBundle(
  records: ExportableRecord[],
  maxFilesPerZip: number = 50,
  maxSizeBytes: number = 100 * 1024 * 1024
): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (records.length > maxFilesPerZip) {
    warnings.push(`Export contains ${records.length} files; limit is ${maxFilesPerZip}. Consider splitting into multiple batches.`);
  }

  const totalSize = estimateExportSize(records);
  if (totalSize > maxSizeBytes) {
    warnings.push(`Estimated ZIP size (~${(totalSize / (1024 * 1024)).toFixed(2)}MB) may exceed ${(maxSizeBytes / (1024 * 1024))
      .toFixed(2)}MB limit.`);
  }

  return {
    valid: warnings.length === 0 || records.length <= maxFilesPerZip,
    warnings,
  };
}

/**
 * Generate a ZIP file from structured records
 * Note: Returns a structured response; actual buffering handled by route
 */
export function prepareZIPManifest(records: ExportableRecord[]): {
  files: Array<{ fileName: string; contentType: string }>;
  totalRecords: number;
  zipFileName: string;
} {
  return {
    files: records.map((r) => ({
      fileName: r.fileName || `${r.recordId}.pdf`,
      contentType: "application/pdf",
    })),
    totalRecords: records.length,
    zipFileName: `exports_${new Date().toISOString().slice(0, 10)}.zip`,
  };
}
