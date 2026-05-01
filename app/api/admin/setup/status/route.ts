import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { getOptionalD1Client } from "@/app/db/runtime";
import {
  admissionSettings,
  classArms,
  classes,
  sessions,
  subjects,
  terms,
} from "@/app/db/schema";

export async function GET(req: Request) {
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

    const [sessionRows, currentTermRows, classRows, armRows, subjectRows, admissionRows] =
      await Promise.all([
        d1.select({ id: sessions.id }).from(sessions).where(eq(sessions.schoolId, admin.schoolId)).limit(1),
        d1
          .select({ id: terms.id })
          .from(terms)
          .where(and(eq(terms.schoolId, admin.schoolId), eq(terms.isCurrent, true)))
          .limit(1),
        d1.select({ id: classes.id }).from(classes).where(eq(classes.schoolId, admin.schoolId)).limit(1),
        d1.select({ id: classArms.id }).from(classArms).where(eq(classArms.schoolId, admin.schoolId)).limit(1),
        d1.select({ id: subjects.id }).from(subjects).where(eq(subjects.schoolId, admin.schoolId)).limit(1),
        d1
          .select({ id: admissionSettings.id })
          .from(admissionSettings)
          .where(eq(admissionSettings.schoolId, admin.schoolId))
          .limit(1),
      ]);

    const status = {
      hasSession: sessionRows.length > 0,
      hasCurrentTerm: currentTermRows.length > 0,
      hasClasses: classRows.length > 0,
      hasArms: armRows.length > 0,
      hasSubjects: subjectRows.length > 0,
      hasAdmissionSettings: admissionRows.length > 0,
    };

    const isComplete = Object.values(status).every(Boolean);

    return NextResponse.json({
      isComplete,
      status,
      nextStep: !status.hasSession
        ? 2
        : !status.hasCurrentTerm
        ? 3
        : !status.hasClasses
        ? 4
        : !status.hasArms
        ? 5
        : !status.hasSubjects
        ? 6
        : !status.hasAdmissionSettings
        ? 7
        : 8,
    });
  } catch (error: unknown) {
    console.error("Setup status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch setup status" },
      { status: 500 }
    );
  }
}
