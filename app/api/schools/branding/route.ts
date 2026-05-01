import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import School from "@/app/models/School";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = token ? verifyToken(token) : null;
    const { searchParams } = new URL(req.url);
    const schoolIdFromQuery = String(searchParams.get("schoolId") || "").trim();
    const schoolId = user?.schoolId || schoolIdFromQuery;

    if (!schoolId) {
      return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    await connectDB();
    const school = await School.findById(new mongoose.Types.ObjectId(schoolId)).lean();

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json({
      branding: {
        schoolId: (school as { _id: mongoose.Types.ObjectId })._id.toString(),
        name: (school as { name: string }).name,
        logoUrl: (school as { logoUrl?: string }).logoUrl ?? null,
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

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const logoUrl = String(body?.logoUrl || "").trim();

    const update: Record<string, unknown> = {};
    if (name) update.name = name;
    if ("logoUrl" in body) update.logoUrl = logoUrl || null;

    await connectDB();
    await School.findByIdAndUpdate(new mongoose.Types.ObjectId(admin.schoolId), { $set: update });

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