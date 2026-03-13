import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { classArms, classes, sections } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

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
    const level = String(body?.level || "").trim().toUpperCase();
    const arm = String(body?.arm || "").trim().toUpperCase();

    if (!level || !arm) {
      return NextResponse.json({ error: "Level and arm are required" }, { status: 400 });
    }

    const now = new Date();
    const className = `${level} ${arm}`;
    let classId = "";
    const existingClass = await d1
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.schoolId, admin.schoolId), eq(classes.name, className)))
      .limit(1);

    if (existingClass.length > 0) {
      classId = existingClass[0].id;
    } else {
      classId = crypto.randomUUID();
      await d1.insert(classes).values({
        id: classId,
        schoolId: admin.schoolId,
        name: className,
        level,
        createdAt: now,
        updatedAt: now,
      });
    }

    let armId = "";
    const existingArm = await d1
      .select({ id: classArms.id })
      .from(classArms)
      .where(and(eq(classArms.schoolId, admin.schoolId), eq(classArms.name, arm)))
      .limit(1);

    if (existingArm.length > 0) {
      armId = existingArm[0].id;
    } else {
      armId = crypto.randomUUID();
      await d1.insert(classArms).values({
        id: armId,
        schoolId: admin.schoolId,
        name: arm,
        createdAt: now,
        updatedAt: now,
      });
    }

    const existingSection = await d1
      .select({ id: sections.id })
      .from(sections)
      .where(
        and(
          eq(sections.schoolId, admin.schoolId),
          eq(sections.classId, classId),
          eq(sections.armId, armId)
        )
      )
      .limit(1);

    if (existingSection.length === 0) {
      await d1.insert(sections).values({
        id: crypto.randomUUID(),
        schoolId: admin.schoolId,
        classId,
        armId,
        name: className,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({
      message: existingClass.length > 0 ? "Class already existed; section ensured" : "Class created successfully",
      className,
      class: {
        _id: classId,
        id: classId,
        name: className,
        level,
        arm,
      },
    });
  } catch (error: unknown) {
    console.error("Create class error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create class" },
      { status: 500 }
    );
  }
}