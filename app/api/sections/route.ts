import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { getOptionalD1Client } from "@/app/db/runtime";
import { classArms, classes, sections } from "@/app/db/schema";

const sectionSchema = z.object({
  classId: z.string().trim().min(1),
  armId: z.string().trim().min(1),
});

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

    const url = new URL(req.url);
    const classId = url.searchParams.get("classId");

    const base = d1
      .select({
        id: sections.id,
        schoolId: sections.schoolId,
        classId: sections.classId,
        armId: sections.armId,
        name: sections.name,
        className: classes.name,
        armName: classArms.name,
      })
      .from(sections)
      .innerJoin(classes, eq(sections.classId, classes.id))
      .innerJoin(classArms, eq(sections.armId, classArms.id));

    const rows = classId
      ? await base.where(and(eq(sections.schoolId, user.schoolId), eq(sections.classId, classId)))
      : await base.where(eq(sections.schoolId, user.schoolId));

    return NextResponse.json({ sections: rows });
  } catch (error: unknown) {
    console.error("List sections error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list sections" },
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

    const parsed = sectionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid section payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        },
        { status: 400 }
      );
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const classRows = await d1
      .select({ id: classes.id, name: classes.name })
      .from(classes)
      .where(and(eq(classes.id, parsed.data.classId), eq(classes.schoolId, admin.schoolId)))
      .limit(1);

    const armRows = await d1
      .select({ id: classArms.id, name: classArms.name })
      .from(classArms)
      .where(and(eq(classArms.id, parsed.data.armId), eq(classArms.schoolId, admin.schoolId)))
      .limit(1);

    if (!classRows[0] || !armRows[0]) {
      return NextResponse.json({ error: "Invalid classId or armId" }, { status: 400 });
    }

    const existing = await d1
      .select({ id: sections.id })
      .from(sections)
      .where(
        and(
          eq(sections.schoolId, admin.schoolId),
          eq(sections.classId, parsed.data.classId),
          eq(sections.armId, parsed.data.armId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "Section already exists" }, { status: 409 });
    }

    const now = new Date();
    const id = crypto.randomUUID();
    const name = `${classRows[0].name} ${armRows[0].name}`;

    await d1.insert(sections).values({
      id,
      schoolId: admin.schoolId,
      classId: parsed.data.classId,
      armId: parsed.data.armId,
      name,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ message: "Section created", section: { id, name } }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create section error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create section" },
      { status: 500 }
    );
  }
}
