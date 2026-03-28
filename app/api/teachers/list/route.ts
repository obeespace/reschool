import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { users } from "@/app/db/schema";
import { getTeacherProfileData } from "@/app/utils/schoolRelationships";
import { and, eq } from "drizzle-orm";

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
      .select({
        id: users.id,
        fullName: users.name,
        email: users.email,
      })
      .from(users)
      .where(and(eq(users.schoolId, user.schoolId), eq(users.role, "TEACHER")));

    const teachers = await Promise.all(
      rows.map(async (row) => {
        const profile = await getTeacherProfileData(d1, user.schoolId, row.id);
        return {
          _id: row.id,
          id: row.id,
          fullName: row.fullName,
          email: row.email,
          profile: profile
            ? {
                classTeacherOf: profile.classTeacherOf,
                subjectsAndClasses: profile.subjectsAndClasses,
              }
            : {
                classTeacherOf: null,
                subjectsAndClasses: [],
              },
        };
      })
    );

    return NextResponse.json({ teachers });
  } catch (error: unknown) {
    console.error("Fetch teachers error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch teachers" },
      { status: 500 }
    );
  }
}