import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { getOptionalD1Client } from "@/app/db/runtime";
import {
  admissionSettings,
  classArms,
  classes,
  schools,
  sections,
  sessions,
  subjects,
  terms,
} from "@/app/db/schema";
import { DEFAULT_TERM_NAMES } from "@/app/lib/setupTemplates";

const setupSchema = z.object({
  school: z
    .object({
      name: z.string().min(2).max(120),
      address: z.string().max(255).optional(),
      logoUrl: z.string().max(500).optional(),
    })
    .optional(),
  session: z.object({
    year: z.string().min(7).max(20),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
  terms: z
    .array(
      z.object({
        name: z.string().min(3).max(30),
      })
    )
    .length(3)
    .optional(),
  classes: z.array(z.string().min(1).max(60)).min(1),
  arms: z.array(z.string().min(1).max(30)).min(1),
  subjects: z.array(z.string().min(1).max(80)).min(1),
  admissionSettings: z.object({
    prefix: z.string().min(1).max(20),
    yearFormat: z.enum(["YYYY", "YY"]),
    numberLength: z.number().int().min(2).max(6),
  }),
  autoCreateSections: z.boolean().default(true),
});

function uniq(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of values) {
    const key = raw.trim();
    if (!key) continue;
    const lowered = key.toLowerCase();
    if (!seen.has(lowered)) {
      seen.add(lowered);
      output.push(key);
    }
  }
  return output;
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

    const parsed = setupSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid setup payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const now = new Date();

    const sessionStart = new Date(payload.session.startDate);
    const sessionEnd = new Date(payload.session.endDate);

    if (sessionStart >= sessionEnd) {
      return NextResponse.json(
        { error: "session.startDate must be before session.endDate" },
        { status: 400 }
      );
    }

    const classNames = uniq(payload.classes);
    const armNames = uniq(payload.arms);
    const subjectNames = uniq(payload.subjects);

    if (!classNames.length || !armNames.length || !subjectNames.length) {
      return NextResponse.json(
        { error: "At least one class, arm, and subject is required" },
        { status: 400 }
      );
    }

    await d1.transaction(async (tx) => {
      if (payload.school) {
        await tx
          .update(schools)
          .set({
            name: payload.school.name,
            address: payload.school.address ?? null,
            logoUrl: payload.school.logoUrl ?? null,
            updatedAt: now,
          })
          .where(eq(schools.id, admin.schoolId));
      }

      await tx.update(sessions).set({ isCurrent: false, updatedAt: now }).where(eq(sessions.schoolId, admin.schoolId));
      const existingSession = await tx
        .select({ id: sessions.id })
        .from(sessions)
        .where(and(eq(sessions.schoolId, admin.schoolId), eq(sessions.year, payload.session.year)))
        .limit(1);

      const schoolSessionId = existingSession[0]?.id || crypto.randomUUID();
      if (existingSession.length > 0) {
        await tx
          .update(sessions)
          .set({
            startDate: sessionStart,
            endDate: sessionEnd,
            isCurrent: true,
            updatedAt: now,
          })
          .where(eq(sessions.id, schoolSessionId));
      } else {
        await tx.insert(sessions).values({
          id: schoolSessionId,
          schoolId: admin.schoolId,
          year: payload.session.year,
          startDate: sessionStart,
          endDate: sessionEnd,
          isCurrent: true,
          createdAt: now,
          updatedAt: now,
        });
      }

      await tx.update(terms).set({ isCurrent: false, updatedAt: now }).where(eq(terms.schoolId, admin.schoolId));
      const termNames = payload.terms?.map((t) => t.name) || [...DEFAULT_TERM_NAMES];
      for (let i = 0; i < termNames.length; i += 1) {
        const existingTerm = await tx
          .select({ id: terms.id })
          .from(terms)
          .where(and(eq(terms.sessionId, schoolSessionId), eq(terms.termNumber, i + 1)))
          .limit(1);

        if (existingTerm.length > 0) {
          await tx
            .update(terms)
            .set({
              name: termNames[i],
              startDate: sessionStart,
              endDate: sessionEnd,
              isCurrent: i === 0,
              isPaid: i === 0,
              isClosed: false,
              paymentDate: i === 0 ? now : null,
              paymentReference: i === 0 ? `SETUP-${Date.now()}` : null,
              updatedAt: now,
            })
            .where(eq(terms.id, existingTerm[0].id));
        } else {
          await tx.insert(terms).values({
            id: crypto.randomUUID(),
            schoolId: admin.schoolId,
            sessionId: schoolSessionId,
            termNumber: i + 1,
            name: termNames[i],
            startDate: sessionStart,
            endDate: sessionEnd,
            isCurrent: i === 0,
            isPaid: i === 0,
            isClosed: false,
            paymentDate: i === 0 ? now : null,
            paymentReference: i === 0 ? `SETUP-${Date.now()}` : null,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      const existingClasses = await tx.select().from(classes).where(eq(classes.schoolId, admin.schoolId));
      const classIdByName = new Map(existingClasses.map((c) => [c.name.toLowerCase(), c.id]));

      for (const className of classNames) {
        if (!classIdByName.has(className.toLowerCase())) {
          const classId = crypto.randomUUID();
          await tx.insert(classes).values({
            id: classId,
            schoolId: admin.schoolId,
            name: className,
            level: className,
            createdAt: now,
            updatedAt: now,
          });
          classIdByName.set(className.toLowerCase(), classId);
        }
      }

      const existingArms = await tx.select().from(classArms).where(eq(classArms.schoolId, admin.schoolId));
      const armIdByName = new Map(existingArms.map((a) => [a.name.toLowerCase(), a.id]));

      for (const armName of armNames) {
        if (!armIdByName.has(armName.toLowerCase())) {
          const armId = crypto.randomUUID();
          await tx.insert(classArms).values({
            id: armId,
            schoolId: admin.schoolId,
            name: armName,
            createdAt: now,
            updatedAt: now,
          });
          armIdByName.set(armName.toLowerCase(), armId);
        }
      }

      const existingSubjects = await tx.select().from(subjects).where(eq(subjects.schoolId, admin.schoolId));
      const subjectNamesSet = new Set(existingSubjects.map((s) => s.name.toLowerCase()));
      for (const subjectName of subjectNames) {
        if (!subjectNamesSet.has(subjectName.toLowerCase())) {
          await tx.insert(subjects).values({
            id: crypto.randomUUID(),
            schoolId: admin.schoolId,
            name: subjectName,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      if (payload.autoCreateSections) {
        const existingSections = await tx.select().from(sections).where(eq(sections.schoolId, admin.schoolId));
        const existingSectionKeys = new Set(
          existingSections.map((s) => `${s.classId.toLowerCase()}::${s.armId.toLowerCase()}`)
        );

        for (const className of classNames) {
          const classId = classIdByName.get(className.toLowerCase());
          if (!classId) continue;
          for (const armName of armNames) {
            const armId = armIdByName.get(armName.toLowerCase());
            if (!armId) continue;
            const key = `${classId.toLowerCase()}::${armId.toLowerCase()}`;
            if (existingSectionKeys.has(key)) continue;

            await tx.insert(sections).values({
              id: crypto.randomUUID(),
              schoolId: admin.schoolId,
              classId,
              armId,
              name: `${className} ${armName}`,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      }

      const existingAdmission = await tx
        .select({ id: admissionSettings.id })
        .from(admissionSettings)
        .where(eq(admissionSettings.schoolId, admin.schoolId))
        .limit(1);

      if (existingAdmission.length > 0) {
        await tx
          .update(admissionSettings)
          .set({
            prefix: payload.admissionSettings.prefix,
            yearFormat: payload.admissionSettings.yearFormat,
            numberLength: payload.admissionSettings.numberLength,
            updatedAt: now,
          })
          .where(eq(admissionSettings.schoolId, admin.schoolId));
      } else {
        await tx.insert(admissionSettings).values({
          id: crypto.randomUUID(),
          schoolId: admin.schoolId,
          prefix: payload.admissionSettings.prefix,
          yearFormat: payload.admissionSettings.yearFormat,
          numberLength: payload.admissionSettings.numberLength,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    return NextResponse.json({ message: "Setup completed successfully" }, { status: 201 });
  } catch (error: unknown) {
    console.error("Setup initialize error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initialize setup" },
      { status: 500 }
    );
  }
}
