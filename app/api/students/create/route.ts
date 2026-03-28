import bcrypt from "bcryptjs";
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import {
  admissionSettings,
  classes,
  enrollments,
  parentWardLinks,
  sections,
  sessions,
  students,
  terms,
  users,
} from "@/app/db/schema";
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
  dateOfBirth: z.string().trim().optional(),
  classId: z.string().trim().optional(),
  sectionId: z.string().trim().optional(),
  parentFullName: z.string().trim().optional(),
  parentEmail: z.string().trim().optional(),
  parentPhone: z.string().trim().optional(),
  parentPassword: z.string().trim().optional(),
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
    const parsedDob = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    const dateOfBirth = parsedDob && Number.isFinite(parsedDob.getTime()) ? parsedDob : null;
    const classId = body.classId ? String(body.classId).trim() : null;
    const sectionId = body.sectionId ? String(body.sectionId).trim() : null;
    const parentFullName = String(body.parentFullName || "").trim();
    const parentEmailRaw = String(body.parentEmail || "").trim().toLowerCase();
    const parentPhone = String(body.parentPhone || "").trim();
    const parentPassword = String(body.parentPassword || "").trim();

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

    let resolvedClassId: string | null = null;
    let resolvedSectionId: string | null = null;

    if (sectionId) {
      const sectionRows = await d1
        .select({ id: sections.id, classId: sections.classId })
        .from(sections)
        .where(and(eq(sections.id, sectionId), eq(sections.schoolId, admin.schoolId)))
        .limit(1);

      if (sectionRows[0]) {
        resolvedSectionId = sectionRows[0].id;
        resolvedClassId = sectionRows[0].classId;
      }
    }

    if (!resolvedClassId && classId) {
      const classRows = await d1
        .select({ id: classes.id })
        .from(classes)
        .where(and(eq(classes.id, classId), eq(classes.schoolId, admin.schoolId)))
        .limit(1);

      if (classRows[0]) {
        resolvedClassId = classRows[0].id;
      }
    }

    let temporaryParentPassword: string | null = null;

    await d1.transaction(async (tx) => {
      await tx.insert(students).values({
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

      if (resolvedClassId && currentSessionRows[0] && currentTermRows[0]) {
        await tx.insert(enrollments).values({
          id: crypto.randomUUID(),
          schoolId: admin.schoolId,
          studentId,
          classId: resolvedClassId,
          sectionId: resolvedSectionId,
          sessionId: currentSessionRows[0].id,
          termId: currentTermRows[0].id,
          createdAt: now,
          updatedAt: now,
        });
      }

      if (parentEmailRaw || parentPhone) {
        const digits = parentPhone.replace(/\D/g, "");
        const parentEmail = parentEmailRaw || (digits ? `parent-${digits}@local.reschool` : `parent-${crypto.randomUUID()}@local.reschool`);

        const existingUserRows = await tx
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(and(eq(users.schoolId, admin.schoolId), eq(users.email, parentEmail)))
          .limit(1);

        let parentId = "";
        if (existingUserRows[0]) {
          if (existingUserRows[0].role !== "PARENT") {
            throw new Error("Guardian email already belongs to a non-parent account");
          }
          parentId = existingUserRows[0].id;
        } else {
          parentId = crypto.randomUUID();
          const generatedPassword = parentPassword || `Parent@${Math.floor(100000 + Math.random() * 900000)}`;
          temporaryParentPassword = parentPassword ? null : generatedPassword;
          const passwordHash = await bcrypt.hash(generatedPassword, 10);

          await tx.insert(users).values({
            id: parentId,
            schoolId: admin.schoolId,
            name: parentFullName || `Guardian of ${fullName}`,
            email: parentEmail,
            passwordHash,
            role: "PARENT",
            createdAt: now,
            updatedAt: now,
          });
        }

        const existingLinkRows = await tx
          .select({ id: parentWardLinks.id })
          .from(parentWardLinks)
          .where(
            and(
              eq(parentWardLinks.schoolId, admin.schoolId),
              eq(parentWardLinks.parentId, parentId),
              eq(parentWardLinks.studentId, studentId)
            )
          )
          .limit(1);

        if (!existingLinkRows[0]) {
          const primaryRows = await tx
            .select({ id: parentWardLinks.id })
            .from(parentWardLinks)
            .where(
              and(
                eq(parentWardLinks.schoolId, admin.schoolId),
                eq(parentWardLinks.studentId, studentId),
                eq(parentWardLinks.isPrimary, true)
              )
            )
            .limit(1);

          await tx.insert(parentWardLinks).values({
            id: crypto.randomUUID(),
            schoolId: admin.schoolId,
            parentId,
            studentId,
            relationship: "GUARDIAN",
            isPrimary: !primaryRows[0],
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    });

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
      temporaryParentPassword,
    });
  } catch (error: unknown) {
    console.error("Create student error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create student" },
      { status: 500 }
    );
  }
}