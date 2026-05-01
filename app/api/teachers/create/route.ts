import bcrypt from "bcryptjs";
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { classes, teacherClassAssignments, teacherSubjectAssignments, users } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import { getTeacherProfileData } from "@/app/utils/schoolRelationships";

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

    return NextResponse.json({
      profile,
    });
  } catch (error: unknown) {
    console.error("Fetch teacher profile error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch teacher profile" },
      { status: 500 }
    );
  }
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

    const body = await req.json();
    const fullName = String(body?.fullName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const classTeacherOf = body?.classTeacherOf ? String(body.classTeacherOf).trim() : "";
    const subjectsAndClasses = Array.isArray(body?.subjectsAndClasses) ? body.subjectsAndClasses : [];

    if (!fullName || !email || password.length < 6) {
      return NextResponse.json(
        { error: "Full name, valid email, and password (min 6 chars) are required" },
        { status: 400 }
      );
    }

    const existing = await d1
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.schoolId, admin.schoolId), eq(users.email, email)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const now = new Date();
    const teacherId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    await d1.transaction(async (tx) => {
      await tx.insert(users).values({
        id: teacherId,
        schoolId: admin.schoolId,
        name: fullName,
        email,
        passwordHash,
        role: "TEACHER",
        createdAt: now,
        updatedAt: now,
      });

      if (classTeacherOf) {
        const classExists = await tx
          .select({ id: classes.id })
          .from(classes)
          .where(and(eq(classes.schoolId, admin.schoolId), eq(classes.id, classTeacherOf)))
          .limit(1);

        if (classExists[0]) {
          await tx
            .delete(teacherClassAssignments)
            .where(and(eq(teacherClassAssignments.schoolId, admin.schoolId), eq(teacherClassAssignments.classId, classTeacherOf)));

          await tx.insert(teacherClassAssignments).values({
            id: crypto.randomUUID(),
            schoolId: admin.schoolId,
            teacherId,
            classId: classTeacherOf,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      for (const assignment of subjectsAndClasses) {
        const subjectId = String(assignment?.subjectId || "").trim();
        const classIds = Array.isArray(assignment?.classIds) ? assignment.classIds : [];
        if (!subjectId) continue;

        for (const rawClassId of classIds) {
          const classId = String(rawClassId || "").trim();
          if (!classId) continue;
          await tx.insert(teacherSubjectAssignments).values({
            id: crypto.randomUUID(),
            schoolId: admin.schoolId,
            teacherId,
            subjectId,
            classId,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    });

    const profile = await getTeacherProfileData(d1, admin.schoolId, teacherId);

    return NextResponse.json({
      message: "Teacher created successfully",
      teacher: {
        _id: teacherId,
        id: teacherId,
        fullName,
        email,
        profile: profile
          ? {
              classTeacherOf: profile.classTeacherOf,
              subjectsAndClasses: profile.subjectsAndClasses,
            }
          : {
              classTeacherOf: null,
              subjectsAndClasses: [],
            },
      },
    });
  } catch (error: unknown) {
    console.error("Create teacher error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create teacher" },
      { status: 500 }
    );
  }
}