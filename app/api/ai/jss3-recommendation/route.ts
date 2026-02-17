import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
import AIGuidance from "@/app/models/AIGuidance";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

/**
 * AI Guidance Counselor for JSS3 Students
 * Analyzes final scores to recommend Science, Art, or Commercial stream
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
      stage: "JSS3"
    });

    if (existingRecommendation) {
      return NextResponse.json({
        message: "Recommendation already exists for this student",
        recommendation: existingRecommendation
      });
    }

    // Get all JSS3 scores for this student
    const scores = await Score.find({ studentId })
      .populate("subjectId", "name code")
      .lean();

    if (scores.length === 0) {
      return NextResponse.json(
        {
          error: "No scores found for this student. Cannot generate recommendation.",
          recommendation: "PENDING"
        },
        { status: 400 }
      );
    }

    // Group subjects and calculate totals by stream
    let science = 0,
      art = 0,
      commercial = 0;
    let scienceCount = 0,
      artCount = 0,
      commercialCount = 0;

    // Subject categorization (Nigerian curriculum)
    const scienceSubjects = [
      "mathematics",
      "physics",
      "chemistry",
      "biology",
      "integrated science",
      "agricultural science"
    ];
    const artSubjects = [
      "english",
      "literature",
      "history",
      "government",
      "crs",
      "geography",
      "french"
    ];
    const commercialSubjects = [
      "economics",
      "commerce",
      "business studies",
      "accounting",
      "office practice"
    ];

    scores.forEach((score: any) => {
      const subjectName = (score.subjectId?.name || "")
        .toLowerCase()
        .trim();

      if (scienceSubjects.some((s) => subjectName.includes(s))) {
        science += score.total || 0;
        scienceCount++;
      } else if (artSubjects.some((s) => subjectName.includes(s))) {
        art += score.total || 0;
        artCount++;
      } else if (commercialSubjects.some((s) => subjectName.includes(s))) {
        commercial += score.total || 0;
        commercialCount++;
      }
    });

    // Calculate averages
    const scienceAvg = scienceCount > 0 ? science / scienceCount : 0;
    const artAvg = artCount > 0 ? art / artCount : 0;
    const commercialAvg = commercialCount > 0 ? commercial / commercialCount : 0;

    // Determine the best fit
    let recommendation = "ART"; // Default
    let reasons = [];

    if (scienceAvg >= artAvg && scienceAvg >= commercialAvg && scienceCount > 0) {
      recommendation = "SCIENCE";
      reasons = [
        `Science subjects average: ${scienceAvg.toFixed(1)}/100`,
        `Strong performance in Mathematics, Physics, Chemistry`,
        `Suitable for engineering, medicine, or tech careers`
      ];
    } else if (commercialAvg >= artAvg && commercialCount > 0) {
      recommendation = "COMMERCIAL";
      reasons = [
        `Commercial subjects average: ${commercialAvg.toFixed(1)}/100`,
        `Strong performance in Economics, Commerce, Accounting`,
        `Suitable for business, finance, or accounting careers`
      ];
    } else {
      recommendation = "ART";
      reasons = [
        `Arts subjects average: ${artAvg.toFixed(1)}/100`,
        `Strong performance in Languages, History, Government`,
        `Suitable for humanities, law, public service careers`
      ];
    }

    // Create guidance record
    const guidance = await AIGuidance.create({
      schoolId: admin.schoolId,
      studentId,
      stage: "JSS3",
      recommendation,
      reasons
    });

    return NextResponse.json({
      message: "AI Guidance recommendation generated successfully",
      recommendation: guidance.recommendation,
      reasons: guidance.reasons,
      guidanceId: guidance._id.toString()
    });
  } catch (error: any) {
    console.error("JSS3 AI Guidance error:", error);
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
      stage: "JSS3"
    }).lean();

    if (!guidance) {
      return NextResponse.json({
        recommendation: null,
        message: "No guidance recommendation found for this student"
      });
    }

    return NextResponse.json({ guidance });
  } catch (error: any) {
    console.error("Fetch guidance error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch guidance" },
      { status: 500 }
    );
  }
}

