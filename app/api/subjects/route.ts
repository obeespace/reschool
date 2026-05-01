import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { subjects } from "@/app/db/schema";
import { eq } from "drizzle-orm";

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
      .from(subjects)
      .where(eq(subjects.schoolId, user.schoolId));

    return NextResponse.json({
      subjects: rows.map((row) => ({
        _id: row.id,
        id: row.id,
        name: row.name,
        code: row.name
          .split(/\s+/)
          .map((part) => part[0]?.toUpperCase() || "")
          .join("")
          .slice(0, 6),
      })),
    });
  } catch (error: unknown) {
    console.error("Fetch subjects error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch subjects" },
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
    const name = String(body?.name || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Subject name is required" }, { status: 400 });
    }

    const now = new Date();
    const subjectId = crypto.randomUUID();

    await d1.insert(subjects).values({
      id: subjectId,
      schoolId: admin.schoolId,
      name,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      message: "Subject created successfully",
      subject: {
        _id: subjectId,
        id: subjectId,
        name,
      },
    });
  } catch (error: unknown) {
    console.error("Create subject error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create subject" },
      { status: 500 }
    );
  }
}