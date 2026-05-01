import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { classes, students, teacherRemarks, terms } from "@/app/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN" && user.role !== "PARENT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = String(searchParams.get("studentId") || "").trim();
    const classId = String(searchParams.get("classId") || "").trim();
    const type = String(searchParams.get("type") || "").trim().toUpperCase();

    const rows = await d1
      .select({
        id: teacherRemarks.id,
        studentId: teacherRemarks.studentId,
        classId: teacherRemarks.classId,
        type: teacherRemarks.type,
        subjectId: teacherRemarks.subjectId,
        academicPerformance: teacherRemarks.academicPerformance,
        classParticipation: teacherRemarks.classParticipation,
        attitudeToDuties: teacherRemarks.attitudeToDuties,
        customRemark: teacherRemarks.customRemark,
        promotionRecommendation: teacherRemarks.promotionRecommendation,
        remarkedDate: teacherRemarks.remarkedDate,
      })
      .from(teacherRemarks)
      .where(eq(teacherRemarks.schoolId, user.schoolId))
      .orderBy(desc(teacherRemarks.remarkedDate));

    const filtered = rows.filter((row) => {
      if (studentId && row.studentId !== studentId) return false;
      if (classId && row.classId !== classId) return false;
      if (type && row.type !== type) return false;
      return true;
    });

    return NextResponse.json({ remarks: filtered });
  } catch (error: unknown) {
    console.error("List remarks error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list remarks" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const studentId = String(body?.studentId || "").trim();
    const classId = String(body?.classId || "").trim();
    const type = String(body?.type || "CLASS_TEACHER").trim().toUpperCase();
    const subjectId = body?.subjectId ? String(body.subjectId).trim() : null;

    if (!studentId || !classId) {
      return NextResponse.json({ error: "studentId and classId are required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const [studentRows, classRows, termRows] = await Promise.all([
      d1.select({ id: students.id }).from(students).where(and(eq(students.schoolId, user.schoolId), eq(students.id, studentId))).limit(1),
      d1.select({ id: classes.id }).from(classes).where(and(eq(classes.schoolId, user.schoolId), eq(classes.id, classId))).limit(1),
      d1
        .select({ id: terms.id, sessionId: terms.sessionId, isClosed: terms.isClosed })
        .from(terms)
        .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true)))
        .limit(1),
    ]);

    if (!studentRows[0] || !classRows[0]) {
      return NextResponse.json({ error: "Student or class not found" }, { status: 404 });
    }

    if (!termRows[0]) {
      return NextResponse.json({ error: "No active term found" }, { status: 400 });
    }

    if (termRows[0].isClosed) {
      return NextResponse.json({ error: "Current term is closed" }, { status: 400 });
    }

    const now = new Date();
    const existing = await d1
      .select({ id: teacherRemarks.id })
      .from(teacherRemarks)
      .where(
        and(
          eq(teacherRemarks.schoolId, user.schoolId),
          eq(teacherRemarks.studentId, studentId),
          eq(teacherRemarks.termId, termRows[0].id),
          eq(teacherRemarks.type, type),
          subjectId ? eq(teacherRemarks.subjectId, subjectId) : isNull(teacherRemarks.subjectId)
        )
      )
      .limit(1);

    const payload = {
      academicPerformance: body?.academicPerformance ? String(body.academicPerformance) : null,
      classParticipation: body?.classParticipation ? String(body.classParticipation) : null,
      attitudeToDuties: body?.attitudeToDuties ? String(body.attitudeToDuties) : null,
      customRemark: body?.customRemark ? String(body.customRemark) : null,
      promotionRecommendation: body?.promotionRecommendation ? String(body.promotionRecommendation) : null,
      remarkedBy: user.userId,
      remarkedDate: now,
      updatedAt: now,
    };

    if (existing[0]) {
      await d1.update(teacherRemarks).set(payload).where(eq(teacherRemarks.id, existing[0].id));
      return NextResponse.json({ message: "Remark updated", id: existing[0].id });
    }

    const created = await d1
      .insert(teacherRemarks)
      .values({
        id: crypto.randomUUID(),
        schoolId: user.schoolId,
        sessionId: termRows[0].sessionId,
        termId: termRows[0].id,
        studentId,
        classId,
        sectionId: null,
        type,
        subjectId,
        academicPerformance: payload.academicPerformance,
        classParticipation: payload.classParticipation,
        attitudeToDuties: payload.attitudeToDuties,
        customRemark: payload.customRemark,
        promotionRecommendation: payload.promotionRecommendation,
        remarkedBy: payload.remarkedBy,
        remarkedDate: payload.remarkedDate,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: teacherRemarks.id });

    return NextResponse.json({ message: "Remark created", id: created[0]?.id || null });
  } catch (error: unknown) {
    console.error("Create remark error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create remark" },
      { status: 500 }
    );
  }
}