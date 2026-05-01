import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs, parentWardLinks, results, students, subjects } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

function keywordScore(subjectName: string, score: number, keywords: string[]) {
  const name = subjectName.toLowerCase();
  return keywords.some((keyword) => name.includes(keyword)) ? score : 0;
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || (user.role !== "ADMIN" && user.role !== "PARENT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const studentId = String(body?.studentId || "").trim();
    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    if (user.role === "PARENT") {
      const link = await d1
        .select({ id: parentWardLinks.id })
        .from(parentWardLinks)
        .where(
          and(
            eq(parentWardLinks.schoolId, user.schoolId),
            eq(parentWardLinks.parentId, user.userId),
            eq(parentWardLinks.studentId, studentId)
          )
        )
        .limit(1);
      if (!link[0]) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const studentRows = await d1
      .select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
      .from(students)
      .where(and(eq(students.schoolId, user.schoolId), eq(students.id, studentId)))
      .limit(1);

    if (!studentRows[0]) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const scoreRows = await d1
      .select({ subjectName: subjects.name, score: results.score })
      .from(results)
      .innerJoin(subjects, eq(results.subjectId, subjects.id))
      .where(and(eq(results.schoolId, user.schoolId), eq(results.studentId, studentId)));

    if (scoreRows.length === 0) {
      const emptyPayload = {
        student: {
          id: studentRows[0].id,
          fullName: `${studentRows[0].firstName} ${studentRows[0].lastName}`.trim(),
        },
        recommendations: [],
        topPath: null,
        summary: { message: "No score history available for recommendation.", model: "heuristic-v1", scoreSampleSize: 0 },
      };

      const now = new Date();
      await d1.insert(auditLogs).values({
        id: crypto.randomUUID(),
        schoolId: user.schoolId,
        actorId: user.userId,
        action: "AI_JSS3_RECOMMENDATION_GENERATED",
        metaJson: JSON.stringify({
          studentId,
          studentName: emptyPayload.student.fullName,
          level: "JSS3",
          recommendations: emptyPayload.recommendations,
          topChoice: emptyPayload.topPath,
          summary: emptyPayload.summary,
        }),
        createdAt: now,
        updatedAt: now,
      });

      return NextResponse.json(emptyPayload);
    }

    const scienceKeywords = ["math", "physics", "chem", "biology", "basic science", "further math"];
    const commercialKeywords = ["economics", "commerce", "account", "business", "book keeping"];
    const artsKeywords = ["english", "literature", "government", "history", "crk", "irs", "civic"];

    let science = 0;
    let commercial = 0;
    let arts = 0;
    let considered = 0;

    for (const row of scoreRows) {
      const score = Number(row.score) || 0;
      science += keywordScore(row.subjectName, score, scienceKeywords);
      commercial += keywordScore(row.subjectName, score, commercialKeywords);
      arts += keywordScore(row.subjectName, score, artsKeywords);
      considered += 1;
    }

    const normalized = considered ? (value: number) => Number((value / considered).toFixed(2)) : () => 0;
    const ranked = [
      {
        path: "SCIENCE",
        confidence: normalized(science),
        reason: "Strong performance in Mathematics and core science-related subjects.",
      },
      {
        path: "COMMERCIAL",
        confidence: normalized(commercial),
        reason: "Consistent scores in business and commerce-oriented subjects.",
      },
      {
        path: "ARTS",
        confidence: normalized(arts),
        reason: "Good outcomes in language, humanities, and social science subjects.",
      },
    ].sort((a, b) => b.confidence - a.confidence);

    const responsePayload = {
      student: {
        id: studentRows[0].id,
        fullName: `${studentRows[0].firstName} ${studentRows[0].lastName}`.trim(),
      },
      recommendations: ranked,
      topPath: ranked[0]?.path || null,
      summary: {
        model: "heuristic-v1",
        scoreSampleSize: scoreRows.length,
      },
    };

    const now = new Date();
    await d1.insert(auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: user.schoolId,
      actorId: user.userId,
      action: "AI_JSS3_RECOMMENDATION_GENERATED",
      metaJson: JSON.stringify({
        studentId,
        studentName: responsePayload.student.fullName,
        level: "JSS3",
        recommendations: responsePayload.recommendations,
        topChoice: responsePayload.topPath,
        summary: responsePayload.summary,
      }),
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(responsePayload);
  } catch (error: unknown) {
    console.error("JSS3 recommendation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate JSS3 recommendation" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}