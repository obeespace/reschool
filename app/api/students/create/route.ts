import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { admissionSettings, enrollments, sections, sessions, students, terms } from "@/app/db/schema";
import { and, eq, like } from "drizzle-orm";
import { z } from "zod";

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const name = String(fullName || "").trim();
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return {
      firstName: parts[0] || "Student",
      lastName: "",
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

const createStudentSchema = z.object({
  fullName: z.string().min(2),
  admissionNumber: z.string().trim().optional(),
  gender: z.string().trim().optional(),
  dateOfBirth: z.string().datetime().optional(),
  sectionId: z.string().trim().optional(),
});

function extractSessionStartYear(sessionYear: string): string {
  const match = sessionYear.match(/\d{4}|\d{2}/);
  return match ? match[0] : String(new Date().getFullYear());
}

function formatYear(raw: string, format: string): string {
  const clean = raw.replace(/\D/g, "");
  if (format === "YY") {
    return clean.slice(-2);
  }
  return clean.length >= 4 ? clean.slice(0, 4) : String(new Date().getFullYear());
}

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

    const parsed = createStudentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid student payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const fullName = String(body.fullName || "").trim();
    let admissionNumber = String(body.admissionNumber || "").trim();
    const gender = body.gender ? String(body.gender).trim() : null;
    const dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    const sectionId = body.sectionId ? String(body.sectionId).trim() : null;

    if (!fullName) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 }
      );
    }

    const [settingsRows, currentSessionRows, currentTermRows] = await Promise.all([
      d1
        .select()
        .from(admissionSettings)
        .where(eq(admissionSettings.schoolId, admin.schoolId))
        .limit(1),
      d1
        .select()
        .from(sessions)
        .where(and(eq(sessions.schoolId, admin.schoolId), eq(sessions.isCurrent, true)))
        .limit(1),
      d1
        .select()
        .from(terms)
        .where(and(eq(terms.schoolId, admin.schoolId), eq(terms.isCurrent, true)))
        .limit(1),
    ]);

    if (!admissionNumber) {
      const settings = settingsRows[0];
      if (!settings) {
        return NextResponse.json(
          { error: "Admission settings not configured for this school" },
          { status: 400 }
        );
      }

      const currentSession = currentSessionRows[0];
      const yearBase = currentSession ? extractSessionStartYear(currentSession.year) : String(new Date().getFullYear());
      const yearToken = formatYear(yearBase, settings.yearFormat);
      const prefix = settings.prefix.trim().toUpperCase();
      const pattern = `${prefix}/${yearToken}/%`;

      const rows = await d1
        .select({ admissionNumber: students.admissionNumber })
        .from(students)
        .where(and(eq(students.schoolId, admin.schoolId), like(students.admissionNumber, pattern)));

      let max = 0;
      for (const row of rows) {
        const parts = String(row.admissionNumber || "").split("/");
        const last = parts[parts.length - 1] || "0";
        const n = Number.parseInt(last, 10);
        if (!Number.isNaN(n) && n > max) {
          max = n;
        }
      }

      const next = String(max + 1).padStart(settings.numberLength, "0");
      admissionNumber = `${prefix}/${yearToken}/${next}`;
    }

    const exists = await d1
      .select({ id: students.id })
      .from(students)
      .where(
        and(
          eq(students.schoolId, admin.schoolId),
          eq(students.admissionNumber, admissionNumber)
        )
      )
      .limit(1);

    if (exists.length > 0) {
      return NextResponse.json(
        { error: "A student with this admission number already exists" },
        { status: 409 }
      );
    }

    const now = new Date();
    const studentId = crypto.randomUUID();
    const names = splitFullName(fullName);

    await d1.insert(students).values({
      id: studentId,
      schoolId: admin.schoolId,
      firstName: names.firstName,
      lastName: names.lastName,
      admissionNumber,
      gender,
      dateOfBirth,
      createdAt: now,
      updatedAt: now,
    });

    if (sectionId && currentSessionRows[0] && currentTermRows[0]) {
      const sectionRows = await d1
        .select({ id: sections.id, classId: sections.classId })
        .from(sections)
        .where(and(eq(sections.id, sectionId), eq(sections.schoolId, admin.schoolId)))
        .limit(1);

      const section = sectionRows[0];
      if (section) {
        await d1.insert(enrollments).values({
          id: crypto.randomUUID(),
          schoolId: admin.schoolId,
          studentId,
          classId: section.classId,
          sectionId: section.id,
          sessionId: currentSessionRows[0].id,
          termId: currentTermRows[0].id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return NextResponse.json({
      message: "Student created successfully",
      student: {
        _id: studentId,
        id: studentId,
        fullName,
        admissionNumber,
        gender,
        dateOfBirth,
      },
      warning:
        "Guardian linking is pending D1 migration and was skipped for this student.",
    });
  } catch (error: unknown) {
    console.error("Create student error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create student" },
      { status: 500 }
    );
  }
}