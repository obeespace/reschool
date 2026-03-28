import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { classes } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { getClassSubjectIds } from "@/app/utils/schoolRelationships";

function splitLevelAndArm(className: string, fallbackLevel: string) {
  const normalized = String(className || "").trim();
  const parts = normalized.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    const arm = parts[parts.length - 1].toUpperCase();
    const level = parts.slice(0, -1).join(" ") || fallbackLevel;
    return { level, arm };
  }

  return {
    level: fallbackLevel || normalized,
    arm: "A",
  };
}

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
      .from(classes)
      .where(eq(classes.schoolId, user.schoolId));

    const classIds = rows.map((row) => row.id);
    const classSubjectsMap = await getClassSubjectIds(d1, user.schoolId, classIds);

    const payload = rows.map((row) => {
      const parsed = splitLevelAndArm(row.name, row.level);
      return {
        _id: row.id,
        id: row.id,
        name: row.name,
        level: parsed.level,
        arm: parsed.arm,
        subjectIds: classSubjectsMap.get(row.id) || [],
      };
    });

    return NextResponse.json({ classes: payload });
  } catch (error: unknown) {
    console.error("Fetch classes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch classes" },
      { status: 500 }
    );
  }
}