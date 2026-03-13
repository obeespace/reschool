import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { users } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
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

    const parents = await d1
      .select({
        id: users.id,
        fullName: users.name,
        email: users.email,
      })
      .from(users)
      .where(and(eq(users.schoolId, admin.schoolId), eq(users.role, "PARENT")));

    return NextResponse.json({
      parents: parents.map((parent) => ({
        id: parent.id,
        fullName: parent.fullName,
        email: parent.email,
        wardCount: 0,
      })),
      warning: "Parent-ward linking is pending D1 migration.",
    });
  } catch (error: unknown) {
    console.error("Fetch parents error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch parents" },
      { status: 500 }
    );
  }
}