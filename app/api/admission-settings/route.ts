import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { getOptionalD1Client } from "@/app/db/runtime";
import { admissionSettings } from "@/app/db/schema";

const settingsSchema = z.object({
  prefix: z.string().trim().min(1).max(20),
  yearFormat: z.enum(["YYYY", "YY"]),
  numberLength: z.number().int().min(2).max(6),
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
      .from(admissionSettings)
      .where(eq(admissionSettings.schoolId, user.schoolId))
      .limit(1);

    return NextResponse.json({ settings: rows[0] || null });
  } catch (error: unknown) {
    console.error("Get admission settings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch admission settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const parsed = settingsSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid admission settings payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        },
        { status: 400 }
      );
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const now = new Date();
    const existing = await d1
      .select({ id: admissionSettings.id })
      .from(admissionSettings)
      .where(eq(admissionSettings.schoolId, admin.schoolId))
      .limit(1);

    if (existing.length > 0) {
      await d1
        .update(admissionSettings)
        .set({
          prefix: parsed.data.prefix,
          yearFormat: parsed.data.yearFormat,
          numberLength: parsed.data.numberLength,
          updatedAt: now,
        })
        .where(and(eq(admissionSettings.id, existing[0].id), eq(admissionSettings.schoolId, admin.schoolId)));
    } else {
      await d1.insert(admissionSettings).values({
        id: crypto.randomUUID(),
        schoolId: admin.schoolId,
        prefix: parsed.data.prefix,
        yearFormat: parsed.data.yearFormat,
        numberLength: parsed.data.numberLength,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({ message: "Admission settings saved" });
  } catch (error: unknown) {
    console.error("Update admission settings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save admission settings" },
      { status: 500 }
    );
  }
}
