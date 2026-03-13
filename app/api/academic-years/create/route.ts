import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { schools, sessions, terms as d1Terms } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { invalidateServerCacheByPrefix } from "@/app/utils/serverCache";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const { name, startDate, endDate, setAsActive } = await req.json();
    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Name, start date, and end date are required" },
        { status: 400 }
      );
    }

    const now = Date.now();
    const sessionId = crypto.randomUUID();
    const start = new Date(startDate);
    const end = new Date(endDate);

    await d1
      .insert(schools)
      .values({ id: admin.schoolId, name: "School", createdAt: now, updatedAt: now })
      .onConflictDoNothing();

    if (setAsActive) {
      await d1.update(sessions).set({ isCurrent: false, updatedAt: now }).where(eq(sessions.schoolId, admin.schoolId));
      await d1.update(d1Terms).set({ isCurrent: false, updatedAt: now }).where(eq(d1Terms.schoolId, admin.schoolId));
    }

    await d1.insert(sessions).values({
      id: sessionId,
      schoolId: admin.schoolId,
      year: name,
      startDate: start,
      endDate: end,
      isCurrent: !!setAsActive,
      createdAt: now,
      updatedAt: now,
    });

    const totalDays = Math.max(3, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const termDurationDays = Math.max(1, Math.floor(totalDays / 3));
    const createdTerms: Array<{ termId: string; termNumber: number; startDate: Date; endDate: Date }> = [];

    for (let termNumber = 1; termNumber <= 3; termNumber++) {
      const termId = crypto.randomUUID();
      const termStart = new Date(start);
      termStart.setDate(start.getDate() + (termNumber - 1) * termDurationDays);

      const termEnd = new Date(start);
      if (termNumber === 3) {
        termEnd.setTime(end.getTime());
      } else {
        termEnd.setDate(start.getDate() + termNumber * termDurationDays - 1);
      }

      await d1.insert(d1Terms).values({
        id: termId,
        schoolId: admin.schoolId,
        sessionId,
        termNumber,
        name: `Term ${termNumber}`,
        startDate: termStart,
        endDate: termEnd,
        isCurrent: !!setAsActive && termNumber === 1,
        isPaid: false,
        isClosed: false,
        paymentDate: null,
        paymentReference: null,
        createdAt: now,
        updatedAt: now,
      });

      createdTerms.push({ termId, termNumber, startDate: termStart, endDate: termEnd });
    }

    invalidateServerCacheByPrefix(`academic-years:list:${admin.schoolId}`);
    invalidateServerCacheByPrefix(`terms:list:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`admin:stats:${admin.schoolId}`);

    return NextResponse.json({
      academicYearId: sessionId,
      terms: createdTerms,
      message: "Academic year and 3 terms created successfully",
    });
  } catch (error: unknown) {
    console.error("Academic year creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create academic year" },
      { status: 500 }
    );
  }
}