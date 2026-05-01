import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { reportCards, terms } from "@/app/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getParentWardData, getTeacherProfileData } from "@/app/utils/schoolRelationships";
import { getOrSetServerCache, shouldBypassServerCache } from "@/app/utils/serverCache";

const LOW_ATTENDANCE_THRESHOLD = 75;

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const studentId = String(searchParams.get("studentId") || "").trim();
    const classId = String(searchParams.get("classId") || "").trim();
    const termIdQuery = String(searchParams.get("termId") || "").trim();
    const sessionId = String(searchParams.get("sessionId") || "").trim();
    const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit") || 100)));

    const cacheKey = [
      "reports:list",
      user.schoolId,
      user.userId,
      user.role,
      studentId || "*",
      classId || "*",
      termIdQuery || "current",
      sessionId || "*",
      String(limit),
    ].join(":");

    const payload = await getOrSetServerCache({
      key: cacheKey,
      ttlMs: 45_000,
      bypass: shouldBypassServerCache(req),
      factory: async () => {
        const resolvedTermId = termIdQuery || (
          await d1
            .select({ id: terms.id })
            .from(terms)
            .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true)))
            .limit(1)
        )[0]?.id || "";

        const baseRows = resolvedTermId
          ? await d1
              .select()
              .from(reportCards)
              .where(and(eq(reportCards.schoolId, user.schoolId), eq(reportCards.termId, resolvedTermId)))
              .orderBy(desc(reportCards.generatedDate))
              .limit(limit)
          : await d1
              .select()
              .from(reportCards)
              .where(eq(reportCards.schoolId, user.schoolId))
              .orderBy(desc(reportCards.generatedDate))
              .limit(limit);

        let allowedRows = baseRows;

        if (user.role === "PARENT") {
          const wards = await getParentWardData(d1, user.schoolId, user.userId);
          const wardIds = new Set(wards.map((ward) => ward.id));
          allowedRows = allowedRows.filter((row) => wardIds.has(row.studentId) && Boolean(row.approvedBy));
          if (studentId && !wardIds.has(studentId)) {
            throw new Error("FORBIDDEN");
          }
        }

        if (user.role === "TEACHER") {
          const profile = await getTeacherProfileData(d1, user.schoolId, user.userId);
          const classIds = new Set<string>();
          if (profile?.classTeacherOf?._id) classIds.add(profile.classTeacherOf._id);
          for (const entry of profile?.subjectsAndClasses || []) {
            for (const cls of entry.classIds) {
              if (cls?._id) classIds.add(cls._id);
            }
          }
          allowedRows = allowedRows.filter((row) => classIds.has(row.classId) && Boolean(row.approvedBy));
          if (classId && !classIds.has(classId)) {
            throw new Error("FORBIDDEN");
          }
        }

        const filtered = allowedRows.filter((row) => {
          if (studentId && row.studentId !== studentId) return false;
          if (classId && row.classId !== classId) return false;
          if (sessionId && row.sessionId !== sessionId) return false;
          return true;
        });

        const reports = filtered.map((row) => {
          let subjects: unknown[] = [];
          try {
            const parsed = JSON.parse(row.subjectScoresJson || "[]");
            subjects = Array.isArray(parsed) ? parsed : [];
          } catch {
            subjects = [];
          }

          return {
            id: row.id,
            studentId: row.studentId,
            classId: row.classId,
            className: row.className,
            termId: row.termId,
            sessionId: row.sessionId,
            termNumber: row.termNumber,
            yearLabel: row.yearLabel,
            subjects,
            totalScore: row.totalScore,
            averageScore: row.averageScore,
            classRanking: row.classRanking,
            classSize: row.classSize,
            attendancePercentage: row.attendancePercentage,
            lowAttendanceAlert:
              row.attendancePercentage != null && Number(row.attendancePercentage) < LOW_ATTENDANCE_THRESHOLD,
            promotionStatus: row.promotionStatus,
            generatedDate: row.generatedDate,
            approvedBy: row.approvedBy,
            isReleased: Boolean(row.approvedBy),
            printCount: row.printCount,
          };
        });

        return {
          reports,
          count: reports.length,
          termId: resolvedTermId || null,
          lowAttendanceThreshold: LOW_ATTENDANCE_THRESHOLD,
        };
      },
    });

    return NextResponse.json(payload);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("List reports error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list reports" },
      { status: 500 }
    );
  }
}
