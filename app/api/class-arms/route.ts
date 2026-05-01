import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { getOptionalD1Client } from "@/app/db/runtime";
import { classArms } from "@/app/db/schema";

const armSchema = z.object({
  name: z.string().trim().min(1).max(30),
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

    const rows = await d1
      .select()
      .from(classArms)
      .where(eq(classArms.schoolId, user.schoolId));

    return NextResponse.json({ arms: rows });
  } catch (error: unknown) {
    console.error("List class arms error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list class arms" },
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

    const parsed = armSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid class arm payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        },
        { status: 400 }
      );
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const name = parsed.data.name.toUpperCase();
    const existing = await d1
      .select({ id: classArms.id })
      .from(classArms)
      .where(and(eq(classArms.schoolId, admin.schoolId), eq(classArms.name, name)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "Class arm already exists" }, { status: 409 });
    }

    const now = new Date();
    const id = crypto.randomUUID();
    await d1.insert(classArms).values({
      id,
      schoolId: admin.schoolId,
      name,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ message: "Class arm created", arm: { id, name } }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create class arm error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create class arm" },
      { status: 500 }
    );
  }
}
