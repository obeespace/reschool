import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { getTeacherProfileData } from "@/app/utils/schoolRelationships";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await context.params;
    const teacherId = String(id || "").trim();
    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const teacher = await getTeacherProfileData(d1, admin.schoolId, teacherId);
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json({ teacher });
  } catch (error: unknown) {
    console.error("Fetch teacher detail error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch teacher detail" },
      { status: 500 }
    );
  }
}