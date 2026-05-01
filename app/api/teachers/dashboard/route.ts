import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { classes, enrollments, terms } from "@/app/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getTeacherProfileData } from "@/app/utils/schoolRelationships";

function splitLevelAndArm(className: string, fallbackLevel: string) {
  const normalized = String(className || "").trim();
  const parts = normalized.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    const arm = parts[parts.length - 1].toUpperCase();
    const level = parts.slice(0, -1).join(" ") || fallbackLevel;
    return { level, arm };
  }

  return { level: fallbackLevel || normalized, arm: "A" };
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");

    if (!teacher || teacher.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const profile = await getTeacherProfileData(d1, teacher.schoolId, teacher.userId);
    if (!profile) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    const taughtClassIds = new Set<string>();
    if (profile.classTeacherOf?._id) {
      taughtClassIds.add(profile.classTeacherOf._id);
    }
    for (const item of profile.subjectsAndClasses) {
      for (const cls of item.classIds) {
        if (cls?._id) {
          taughtClassIds.add(cls._id);
        }
      }
    }

    const classIds = [...taughtClassIds];
    const currentTermRows = await d1
      .select({ id: terms.id })
      .from(terms)
      .where(and(eq(terms.schoolId, teacher.schoolId), eq(terms.isCurrent, true)))
      .limit(1);

    const currentTermId = currentTermRows[0]?.id || null;
    const studentCountRows = currentTermId && classIds.length
      ? await d1
          .select({ classId: enrollments.classId, studentId: enrollments.studentId })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.schoolId, teacher.schoolId),
              eq(enrollments.termId, currentTermId),
              inArray(enrollments.classId, classIds)
            )
          )
      : [];

    const studentIds = new Set<string>();
    for (const row of studentCountRows) {
      if (classIds.includes(row.classId)) {
        studentIds.add(row.studentId);
      }
    }

    const classTeacherStudentCount = profile.classTeacherOf?._id
      ? new Set(
          studentCountRows
            .filter((row) => row.classId === profile.classTeacherOf?._id)
            .map((row) => row.studentId)
        ).size
      : 0;

    const classesPayload = classIds.length
      ? await d1
          .select({ id: classes.id, name: classes.name, level: classes.level })
          .from(classes)
          .where(and(eq(classes.schoolId, teacher.schoolId), inArray(classes.id, classIds)))
          .then((rows) =>
            rows.map((row) => {
              const parsed = splitLevelAndArm(row.name, row.level);
              return {
                _id: row.id,
                name: row.name,
                level: parsed.level,
                arm: parsed.arm,
              };
            })
          )
      : [];

    return NextResponse.json({
      stats: {
        myClasses: classIds.length,
        myStudents: studentIds.size,
        scoresUploaded: 0,
      },
      assignments: {
        classTeacherOf: profile.classTeacherOf
          ? {
              ...profile.classTeacherOf,
              studentCount: classTeacherStudentCount,
            }
          : null,
        subjectsAndClasses: profile.subjectsAndClasses.map((entry) => ({
          subject: entry.subjectId,
          classes: entry.classIds,
        })),
      },
      classes: classesPayload,
    });
  } catch (error: unknown) {
    console.error("Teacher dashboard error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch teacher dashboard" },
      { status: 500 }
    );
  }
}