import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { schools } from "@/app/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = token ? verifyToken(token) : null;
    const { searchParams } = new URL(req.url);
    const schoolIdFromQuery = String(searchParams.get("schoolId") || "").trim();
    const schoolId = user?.schoolId || schoolIdFromQuery;

    if (!schoolId) {
      return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    const rows = await d1
      .select({ id: schools.id, name: schools.name, address: schools.address, logoUrl: schools.logoUrl })
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);

    if (!rows[0]) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json({
      branding: {
        schoolId: rows[0].id,
        name: rows[0].name,
        address: rows[0].address,
        logoUrl: rows[0].logoUrl,
      },
    });
  } catch (error: unknown) {
    console.error("School branding fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch school branding" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
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

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const address = String(body?.address || "").trim();
    const logoUrl = String(body?.logoUrl || "").trim();

    const payload: { name?: string; address?: string | null; logoUrl?: string | null; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (name) payload.name = name;
    if ("address" in body) payload.address = address || null;
    if ("logoUrl" in body) payload.logoUrl = logoUrl || null;

    await d1.update(schools).set(payload).where(eq(schools.id, admin.schoolId));

    return NextResponse.json({ message: "Branding updated" });
  } catch (error: unknown) {
    console.error("School branding update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update school branding" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return PATCH(req);
}

export async function PUT(req: Request) {
  return PATCH(req);
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}