import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { classes } from "@/app/db/schema";
import { eq } from "drizzle-orm";

function splitLevelAndArm(className: string, fallbackLevel: string) {
  const normalized = String(className || "").trim();
  const parts = normalized.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    const arm = parts[parts.length - 1].toUpperCase();
    const level = parts.slice(0, -1).join(" ") || fallbackLevel;
    return { level, arm };
  }

  return { level: fallbackLevel || normalized, arm: "A" };
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");

    if (!teacher || teacher.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const classRows = await d1
      .select({ id: classes.id, name: classes.name, level: classes.level })
      .from(classes)
      .where(eq(classes.schoolId, teacher.schoolId));

    const classesPayload = classRows.map((row) => {
      const parsed = splitLevelAndArm(row.name, row.level);
      return {
        _id: row.id,
        name: row.name,
        level: parsed.level,
        arm: parsed.arm,
      };
    });

    return NextResponse.json({
      stats: {
        myClasses: classesPayload.length,
        myStudents: 0,
        scoresUploaded: 0,
      },
      assignments: {
        classTeacherOf: null,
        subjectsAndClasses: [],
      },
      classes: classesPayload,
      warning:
        "Teacher-specific class/subject mappings and score totals are pending D1 migration.",
    });
  } catch (error: unknown) {
    console.error("Teacher dashboard error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch teacher dashboard" },
      { status: 500 }
    );
  }
}