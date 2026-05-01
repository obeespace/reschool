import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import {
  classes,
  schools,
  sessions,
  students,
  subjects,
  terms,
  users,
} from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import { getOrSetServerCache, shouldBypassServerCache } from "@/app/utils/serverCache";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schoolId = user.schoolId;
    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const bypassCache = shouldBypassServerCache(req);
    const payload = await getOrSetServerCache({
      key: `admin:stats:${schoolId}`,
      ttlMs: 20_000,
      bypass: bypassCache,
      factory: async () => {
        const [
          schoolRow,
          activeTermRow,
          teacherRows,
          parentRows,
          studentRows,
          classRows,
          subjectRows,
        ] = await Promise.all([
          d1.select({ name: schools.name }).from(schools).where(eq(schools.id, schoolId)).limit(1),
          d1.select().from(terms).where(and(eq(terms.schoolId, schoolId), eq(terms.isCurrent, true))).limit(1),
          d1.select({ id: users.id }).from(users).where(and(eq(users.schoolId, schoolId), eq(users.role, "TEACHER"))),
          d1.select({ id: users.id }).from(users).where(and(eq(users.schoolId, schoolId), eq(users.role, "PARENT"))),
          d1.select({ id: students.id }).from(students).where(eq(students.schoolId, schoolId)),
          d1.select({ id: classes.id }).from(classes).where(eq(classes.schoolId, schoolId)),
          d1.select({ id: subjects.id }).from(subjects).where(eq(subjects.schoolId, schoolId)),
        ]);

        const activeSession = activeTermRow.length
          ? await d1
              .select({ year: sessions.year })
              .from(sessions)
              .where(eq(sessions.id, activeTermRow[0].sessionId))
              .limit(1)
          : [];

        return {
          schoolName: schoolRow[0]?.name || "School",
          stats: {
            teachers: teacherRows.length,
            students: studentRows.length,
            parents: parentRows.length,
            classes: classRows.length,
            subjects: subjectRows.length,
          },
          activeTerm: activeTermRow.length
            ? {
                academicYear: activeSession[0]?.year || "N/A",
                term: activeTermRow[0].termNumber,
                isPaid: activeTermRow[0].isPaid,
                isClosed: activeTermRow[0].isClosed,
                startDate: activeTermRow[0].startDate,
                endDate: activeTermRow[0].endDate,
              }
            : null,
        };
      },
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch stats",
      },
      { status: 500 }
    );
  }
}