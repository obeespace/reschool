import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { announcementReads, announcements, classes, enrollments, parentWardLinks, terms, users } from "@/app/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

type AnnouncementRecord = {
  id: string;
  title: string;
  message: string;
  announcementType: "GENERAL" | "CLASS_SPECIFIC";
  targetAudience: "ALL" | "TEACHERS_ONLY" | "PARENTS_ONLY";
  classId?: string | null;
  createdAt: Date;
};

function isVisibleToRole(
  record: AnnouncementRecord,
  role: ITokenPayload["role"]
): boolean {
  if (role === "ADMIN") return true;
  if (role === "TEACHER") {
    return record.targetAudience === "ALL" || record.targetAudience === "TEACHERS_ONLY";
  }
  return record.targetAudience === "ALL" || record.targetAudience === "PARENTS_ONLY";
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const rows = await d1
      .select({
        id: announcements.id,
        createdBy: announcements.createdBy,
        title: announcements.title,
        message: announcements.message,
        announcementType: announcements.announcementType,
        targetAudience: announcements.targetAudience,
        classId: announcements.classId,
        createdAt: announcements.createdDate,
      })
      .from(announcements)
      .where(eq(announcements.schoolId, user.schoolId))
      .orderBy(desc(announcements.createdDate));

    let parentVisibleClassIds = new Set<string>();
    if (user.role === "PARENT") {
      const currentTermRows = await d1
        .select({ id: terms.id })
        .from(terms)
        .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true)))
        .limit(1);

      const currentTermId = currentTermRows[0]?.id;
      if (currentTermId) {
        const wardRows = await d1
          .select({ studentId: parentWardLinks.studentId })
          .from(parentWardLinks)
          .where(and(eq(parentWardLinks.schoolId, user.schoolId), eq(parentWardLinks.parentId, user.userId)));

        const wardIds = wardRows.map((row) => row.studentId);
        if (wardIds.length > 0) {
          const enrollmentRows = await d1
            .select({ classId: enrollments.classId })
            .from(enrollments)
            .where(
              and(
                eq(enrollments.schoolId, user.schoolId),
                eq(enrollments.termId, currentTermId),
                inArray(enrollments.studentId, wardIds)
              )
            );
          parentVisibleClassIds = new Set(enrollmentRows.map((row) => row.classId));
        }
      }
    }

    const announcementRows = rows
      .map((row) => {
        const record: AnnouncementRecord = {
          id: row.id,
          title: row.title,
          message: row.message,
          announcementType: row.announcementType === "CLASS_SPECIFIC" ? "CLASS_SPECIFIC" : "GENERAL",
          targetAudience:
            row.targetAudience === "TEACHERS_ONLY" || row.targetAudience === "PARENTS_ONLY"
              ? row.targetAudience
              : "ALL",
          classId: row.classId,
          createdAt: row.createdAt,
        };

        return {
          id: row.id,
          actorId: row.createdBy,
          record,
        };
      })
      .filter((row) => {
        if (!isVisibleToRole(row.record, user.role)) return false;
        if (user.role === "PARENT" && row.record.announcementType === "CLASS_SPECIFIC") {
          if (!row.record.classId) return false;
          return parentVisibleClassIds.has(row.record.classId);
        }
        return true;
      });

    const actorIds = [...new Set(announcementRows.map((row) => row.actorId).filter(Boolean) as string[])];
    const classIds = [...new Set(announcementRows.map((row) => row.record.classId).filter(Boolean) as string[])];

    const [authorRows, classRows] = await Promise.all([
      actorIds.length
        ? d1
            .select({ id: users.id, name: users.name, role: users.role })
            .from(users)
            .where(inArray(users.id, actorIds))
        : Promise.resolve([]),
      classIds.length
        ? d1
            .select({ id: classes.id, name: classes.name })
            .from(classes)
            .where(inArray(classes.id, classIds))
        : Promise.resolve([]),
    ]);

    const authorMap = new Map(authorRows.map((row) => [row.id, row]));
    const classMap = new Map(classRows.map((row) => [row.id, row.name]));

    const readRows = await d1
      .select({ announcementId: announcementReads.announcementId, readAt: announcementReads.readAt })
      .from(announcementReads)
      .where(and(eq(announcementReads.schoolId, user.schoolId), eq(announcementReads.readerId, user.userId)));
    const readMap = new Map(readRows.map((row) => [row.announcementId, row.readAt]));

    return NextResponse.json({
      announcements: announcementRows.map((row) => {
        const author = row.actorId ? authorMap.get(row.actorId) : null;
        const className = row.record.classId ? classMap.get(row.record.classId) || null : null;

        return {
          id: row.record.id,
          title: row.record.title,
          message: row.record.message,
          announcementType: row.record.announcementType,
          targetAudience: row.record.targetAudience,
          classId: row.record.classId || null,
          className,
          createdAt: row.record.createdAt,
          readAt: readMap.get(row.record.id) || null,
          postedBy: {
            id: author?.id || row.actorId || "system",
            name: author?.name || "System",
            role: author?.role || "ADMIN",
          },
        };
      }),
      storageMode: "announcements-table",
    });
  } catch (error: unknown) {
    console.error("Fetch announcements error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}