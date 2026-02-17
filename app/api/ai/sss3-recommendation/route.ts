import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
import AIGuidance from "@/app/models/AIGuidance";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

/**
 * AI Guidance Counselor for SSS3 Students
 * Analyzes final scores to provide university course recommendations
 */

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: any = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { studentId } = await req.json();

    if (!studentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }

    // Check if recommendation already exists
    const existingRecommendation = await AIGuidance.findOne({
      schoolId: admin.schoolId,
      studentId,
      stage: "SSS3"
    });

    if (existingRecommendation) {
      return NextResponse.json({
        message: "Recommendation already exists for this student",
        recommendation: existingRecommendation
      });
    }

    // Get all SSS3 scores
    const scores = await Score.find({ studentId })
      .populate("subjectId", "name code")
      .lean();

    if (scores.length === 0) {
      return NextResponse.json(
        { error: "No scores found for this student", recommendation: "PENDING" },
        { status: 400 }
      );
    }

    // Analyze by subject
    const subjectScores: Record<string, { name: string; total: number }> = {};

    scores.forEach((score: any) => {
      const subjectName = score.subjectId?.name || "Unknown";
      if (!subjectScores[subjectName]) {
        subjectScores[subjectName] = { name: subjectName, total: 0 };
      }
      subjectScores[subjectName].total = Math.max(
        subjectScores[subjectName].total,
        score.total || 0
      );
    });

    // Recommend top 3 performing subjects as focus areas
    const ranked = Object.values(subjectScores)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    const recommendations = ranked.map(
      (s) =>
        `${s.name} (Score: ${s.total}/100) - Primary area of strength`
    );

    // Provide career guidance based on subjects
    let careerPaths: string[] = [];
    const topSubject = ranked[0]?.name.toLowerCase() || "";

    if (
      topSubject.includes("math") ||
      topSubject.includes("physics") ||
      topSubject.includes("chemistry")
    ) {
      careerPaths = [
        "Engineering",
        "Computer Science",
        "Actuarial Science",
        "Physics",
        "Geology"
      ];
    } else if (
      topSubject.includes("biology") ||
      topSubject.includes("chemistry")
    ) {
      careerPaths = [
        "Medicine",
        "Pharmacy",
        "Nursing",
        "Biochemistry",
        "Bioinformatics"
      ];
    } else if (topSubject.includes("economics") || topSubject.includes("accounts")) {
      careerPaths = [
        "Economics",
        "Accounting",
        "Finance",
        "Business Administration",
        "Actuarial Science"
      ];
    } else if (topSubject.includes("law") || topSubject.includes("government")) {
      careerPaths = [
        "Law",
        "Political Science",
        "Public Administration",
        "International Relations",
        "Diplomacy"
      ];
    } else {
      careerPaths = [
        "Humanities",
        "Education",
        "Mass Communication",
        "Social Sciences"
      ];
    }

    const reasons = [
      ...recommendations,
      `Recommended career paths: ${careerPaths.join(", ")}`,
      "University JAMB cutoff scores: 180+. Current performance supports this goal."
    ];

    // Create guidance record
    const guidance = await AIGuidance.create({
      schoolId: admin.schoolId,
      studentId,
      stage: "SSS3",
      recommendation: careerPaths.join(" | "),
      reasons
    });

    return NextResponse.json({
      message: "SSS3 Guidance recommendation generated successfully",
      careerPaths,
      recommendation: guidance.recommendation,
      guidanceId: guidance._id.toString()
    });
  } catch (error: any) {
    console.error("SSS3 AI Guidance error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate recommendation" },
      { status: 500 }
    );
  }
}

// Get recommendation for a student
export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }

    const guidance = await AIGuidance.findOne({
      schoolId: user.schoolId,
      studentId,
      stage: "SSS3"
    }).lean();

    if (!guidance) {
      return NextResponse.json({
        recommendation: null,
        message: "No guidance recommendation found for this student"
      });
    }

    return NextResponse.json({ guidance });
  } catch (error: any) {
    console.error("Fetch SSS3 guidance error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch guidance" },
      { status: 500 }
    );
  }
}
