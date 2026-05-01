import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { users } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import { getParentWardData } from "@/app/utils/schoolRelationships";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parentId = String(searchParams.get("parentId") || "").trim();
    if (!parentId) {
      return NextResponse.json({ error: "parentId is required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const parentRows = await d1
      .select({ id: users.id, fullName: users.name, email: users.email })
      .from(users)
      .where(and(eq(users.schoolId, admin.schoolId), eq(users.id, parentId), eq(users.role, "PARENT")))
      .limit(1);

    if (!parentRows[0]) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    const wards = await getParentWardData(d1, admin.schoolId, parentId);

    return NextResponse.json({
      parent: parentRows[0],
      wards: wards.map((ward) => ({
        id: ward.id,
        fullName: ward.fullName,
        admissionNumber: ward.admissionNumber,
        dateOfBirth: ward.dateOfBirth,
        gender: ward.gender,
        className: ward.className,
      })),
    });
  } catch (error: unknown) {
    console.error("Parent details error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch parent details" },
      { status: 500 }
    );
  }
}