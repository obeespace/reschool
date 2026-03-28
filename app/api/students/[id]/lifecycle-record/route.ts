import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { parentWardLinks, studentLifecycleRecords, students } from "@/app/db/schema";
import { appendMilestone, formatMilestone, parseMilestones } from "@/app/utils/lifecycleMilestones";
import { and, eq } from "drizzle-orm";

async function canParentAccessStudent(
  schoolId: string,
  parentId: string,
  studentId: string
): Promise<boolean> {
  const d1 = getOptionalD1Client();
  if (!d1) return false;

  const rows = await d1
    .select({ id: parentWardLinks.id })
    .from(parentWardLinks)
    .where(
      and(
        eq(parentWardLinks.schoolId, schoolId),
        eq(parentWardLinks.parentId, parentId),
        eq(parentWardLinks.studentId, studentId)
      )
    )
    .limit(1);

  return Boolean(rows[0]);
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "PARENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const studentId = String(id || "").trim();
    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    if (user.role === "PARENT") {
      const allowed = await canParentAccessStudent(user.schoolId, user.userId, studentId);
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const studentRows = await d1
      .select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
      .from(students)
      .where(and(eq(students.schoolId, user.schoolId), eq(students.id, studentId)))
      .limit(1);

    if (!studentRows[0]) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const lifecycleRows = await d1
      .select()
      .from(studentLifecycleRecords)
      .where(
        and(
          eq(studentLifecycleRecords.schoolId, user.schoolId),
          eq(studentLifecycleRecords.studentId, studentId)
        )
      )
      .limit(1);

    const lifecycle = lifecycleRows[0]
      ? {
          ...lifecycleRows[0],
          milestones: JSON.parse(lifecycleRows[0].milestonesJson || "[]"),
          overallPerformance: JSON.parse(lifecycleRows[0].overallPerformanceJson || "{}"),
        }
      : null;

    return NextResponse.json({
      student: {
        id: studentRows[0].id,
        fullName: `${studentRows[0].firstName} ${studentRows[0].lastName}`.trim(),
      },
      lifecycle,
    });
  } catch (error: unknown) {
    console.error("Lifecycle record error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch lifecycle record" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await context.params;
    const studentId = String(id || "").trim();
    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const body = await req.json();
    const now = new Date();

    const existing = await d1
      .select({
        id: studentLifecycleRecords.id,
        currentStatus: studentLifecycleRecords.currentStatus,
        currentClass: studentLifecycleRecords.currentClass,
        graduationDate: studentLifecycleRecords.graduationDate,
        milestonesJson: studentLifecycleRecords.milestonesJson,
      })
      .from(studentLifecycleRecords)
      .where(
        and(
          eq(studentLifecycleRecords.schoolId, admin.schoolId),
          eq(studentLifecycleRecords.studentId, studentId)
        )
      )
      .limit(1);

    let milestones = Array.isArray(body?.milestones)
      ? body.milestones.map((item: unknown) => String(item || "").trim()).filter(Boolean)
      : parseMilestones(existing[0]?.milestonesJson);

    const nextStatus = body?.currentStatus ? String(body.currentStatus).toUpperCase() : "ACTIVE";
    const nextCurrentClass = body?.currentClass ? String(body.currentClass) : null;
    const nextGraduationDate = body?.graduationDate ? new Date(body.graduationDate) : null;
    const nextWithdrawalReason = body?.withdrawalReason ? String(body.withdrawalReason) : null;

    if (!existing[0] && body?.admissionDate) {
      milestones = appendMilestone(
        milestones,
        formatMilestone(
          `Admitted${body?.admissionClass ? ` to ${String(body.admissionClass)}` : ""}`,
          body.admissionDate
        )
      );
    }

    if (existing[0] && nextCurrentClass && nextCurrentClass !== existing[0].currentClass) {
      milestones = appendMilestone(milestones, formatMilestone(`Class updated to ${nextCurrentClass}`, now));
    }

    if (!existing[0] || nextStatus !== existing[0].currentStatus) {
      if (nextStatus === "GRADUATED") {
        milestones = appendMilestone(milestones, formatMilestone("Graduated", nextGraduationDate || now));
      } else if (nextStatus === "REPEATING") {
        milestones = appendMilestone(milestones, formatMilestone("Marked for repetition", now));
      } else if (nextStatus === "WITHDRAWN") {
        milestones = appendMilestone(
          milestones,
          formatMilestone(nextWithdrawalReason ? `Withdrawn: ${nextWithdrawalReason}` : "Withdrawn", now)
        );
      }
    }

    if (nextGraduationDate && String(existing[0]?.graduationDate || "") !== String(nextGraduationDate)) {
      milestones = appendMilestone(milestones, formatMilestone("Graduation date recorded", nextGraduationDate));
    }

    const payload = {
      admissionDate: body?.admissionDate ? new Date(body.admissionDate) : null,
      admissionClass: body?.admissionClass ? String(body.admissionClass) : null,
      currentClass: nextCurrentClass,
      currentStatus: nextStatus,
      milestonesJson: JSON.stringify(milestones),
      graduationDate: nextGraduationDate,
      certificateId: body?.certificateId ? String(body.certificateId) : null,
      certificationStatus: body?.certificationStatus ? String(body.certificationStatus).toUpperCase() : "PENDING",
      suspensionCount: Number.isFinite(Number(body?.suspensionCount)) ? Number(body.suspensionCount) : 0,
      withdrawalReason: nextWithdrawalReason,
      overallPerformanceJson: JSON.stringify(body?.overallPerformance || {}),
      updatedAt: now,
    };

    if (existing[0]) {
      await d1
        .update(studentLifecycleRecords)
        .set(payload)
        .where(eq(studentLifecycleRecords.id, existing[0].id));
      return NextResponse.json({ message: "Lifecycle record updated", id: existing[0].id });
    }

    const created = await d1
      .insert(studentLifecycleRecords)
      .values({
        id: crypto.randomUUID(),
        schoolId: admin.schoolId,
        studentId,
        ...payload,
        createdAt: now,
      })
      .returning({ id: studentLifecycleRecords.id });

    return NextResponse.json({ message: "Lifecycle record created", id: created[0]?.id || null });
  } catch (error: unknown) {
    console.error("Lifecycle update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update lifecycle record" },
      { status: 500 }
    );
  }
}