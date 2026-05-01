import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { parentWardLinks, students, users } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const studentId = String(body?.studentId || "").trim();
    const parentId = String(body?.parentId || "").trim();
    const relationship = String(body?.relationship || "GUARDIAN").trim().toUpperCase();
    const isPrimary = body?.isPrimary === true;

    if (!studentId || !parentId) {
      return NextResponse.json({ error: "studentId and parentId are required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const [studentRows, parentRows] = await Promise.all([
      d1.select({ id: students.id }).from(students).where(and(eq(students.id, studentId), eq(students.schoolId, admin.schoolId))).limit(1),
      d1.select({ id: users.id }).from(users).where(and(eq(users.id, parentId), eq(users.schoolId, admin.schoolId), eq(users.role, "PARENT"))).limit(1),
    ]);

    if (!studentRows[0] || !parentRows[0]) {
      return NextResponse.json({ error: "Student or parent not found" }, { status: 404 });
    }

    const now = new Date();
    await d1.transaction(async (tx) => {
      if (isPrimary) {
        await tx
          .update(parentWardLinks)
          .set({ isPrimary: false, updatedAt: now })
          .where(and(eq(parentWardLinks.schoolId, admin.schoolId), eq(parentWardLinks.studentId, studentId)));
      }

      const existing = await tx
        .select({ id: parentWardLinks.id })
        .from(parentWardLinks)
        .where(
          and(
            eq(parentWardLinks.schoolId, admin.schoolId),
            eq(parentWardLinks.studentId, studentId),
            eq(parentWardLinks.parentId, parentId)
          )
        )
        .limit(1);

      if (existing[0]) {
        await tx
          .update(parentWardLinks)
          .set({ relationship, isPrimary, updatedAt: now })
          .where(eq(parentWardLinks.id, existing[0].id));
      } else {
        await tx.insert(parentWardLinks).values({
          id: crypto.randomUUID(),
          schoolId: admin.schoolId,
          parentId,
          studentId,
          relationship,
          isPrimary,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    return NextResponse.json({ message: "Parent linked successfully" });
  } catch (error: unknown) {
    console.error("Link parent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to link parent" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = String(searchParams.get("studentId") || "").trim();
    const parentId = String(searchParams.get("parentId") || "").trim();

    if (!studentId || !parentId) {
      return NextResponse.json({ error: "studentId and parentId are required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    await d1
      .delete(parentWardLinks)
      .where(
        and(
          eq(parentWardLinks.schoolId, admin.schoolId),
          eq(parentWardLinks.studentId, studentId),
          eq(parentWardLinks.parentId, parentId)
        )
      );

    return NextResponse.json({ message: "Parent unlinked successfully" });
  } catch (error: unknown) {
    console.error("Unlink parent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to unlink parent" },
      { status: 500 }
    );
  }
}