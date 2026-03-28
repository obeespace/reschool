import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs, parentWardLinks, results, students, subjects } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

type Cluster = {
  name: string;
  keywords: string[];
  courses: string[];
  score: number;
};

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

    const clusters: Cluster[] = [
      {
        name: "Engineering and Technology",
        keywords: ["math", "physics", "chem", "technical"],
        courses: ["Engineering", "Computer Science", "Architecture", "Surveying"],
        score: 0,
      },
      {
        name: "Health and Life Sciences",
        keywords: ["biology", "chem", "physics", "health"],
        courses: ["Medicine", "Nursing", "Pharmacy", "Biochemistry"],
        score: 0,
      },
      {
        name: "Business and Social Sciences",
        keywords: ["economics", "commerce", "account", "government", "business"],
        courses: ["Accounting", "Economics", "Business Administration", "Political Science"],
        score: 0,
      },
      {
        name: "Arts and Communication",
        keywords: ["english", "literature", "history", "government", "language"],
        courses: ["Law", "Mass Communication", "International Relations", "Linguistics"],
        score: 0,
      },
    ];

    for (const row of scoreRows) {
      const name = row.subjectName.toLowerCase();
      const value = Number(row.score) || 0;
      for (const cluster of clusters) {
        if (cluster.keywords.some((keyword) => name.includes(keyword))) {
          cluster.score += value;
        }
      }
    }

    const denominator = scoreRows.length || 1;
    const ranked = clusters
      .map((cluster) => ({
        cluster: cluster.name,
        confidence: Number((cluster.score / denominator).toFixed(2)),
        suggestedCourses: cluster.courses,
      }))
      .sort((a, b) => b.confidence - a.confidence);

    const responsePayload = {
      student: {
        id: studentRows[0].id,
        fullName: `${studentRows[0].firstName} ${studentRows[0].lastName}`.trim(),
      },
      recommendations: ranked,
      bestFitCluster: ranked[0]?.cluster || null,
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
      action: "AI_SSS3_RECOMMENDATION_GENERATED",
      metaJson: JSON.stringify({
        studentId,
        studentName: responsePayload.student.fullName,
        level: "SSS3",
        recommendations: responsePayload.recommendations,
        topChoice: responsePayload.bestFitCluster,
        summary: responsePayload.summary,
      }),
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(responsePayload);
  } catch (error: unknown) {
    console.error("SSS3 recommendation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate SSS3 recommendation" },
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