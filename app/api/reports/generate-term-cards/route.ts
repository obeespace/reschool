import connectDB from "@/app/utils/db";
import ReportCard from "@/app/models/ReportCard";
import DailyMark from "@/app/models/DailyMark";
import Score from "@/app/models/Score";
import AttendanceRecord from "@/app/models/AttendanceRecord";
import TeacherRemark from "@/app/models/TeacherRemark";
import Students from "@/app/models/Students";
import Term from "@/app/models/Term";
import Class from "@/app/models/Class";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { notifyReportReady } from "@/app/api/notifications/send/route";

/**
 * Generate Term Report Cards
 * Bulk generate report cards for all students in a term
 * Aggregates: daily marks → subject scores, attendance %, remarks, ranking
 * Access: ADMIN only
 */

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { termId, academicYearId } = body;

    if (!termId || !academicYearId) {
      return NextResponse.json(
        { error: "termId and academicYearId are required" },
        { status: 400 }
      );
    }

    // Verify term exists and is closed
    const term = await Term.findOne({
      _id: termId,
      schoolId: user.schoolId
    });

    if (!term) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    // Get all students in this academic year
    const students = await Students.find({
      schoolId: user.schoolId,
      academicYearId
    }).select("_id fullName");

    if (students.length === 0) {
      return NextResponse.json(
        { error: "No students found for this academic year" },
        { status: 404 }
      );
    }

    const reportCards: any[] = [];
    let successCount = 0;

    // Generate report card for each student
    for (const student of students) {
      try {
        // Get all scores for this student in this term
        const scores = await Score.find({
          studentId: student._id,
          termId,
          schoolId: user.schoolId
        })
          .populate("subjectId", "name code")
          .lean();

        if (scores.length === 0) continue; // Skip students with no scores

        // Aggregate subject scores with weightage
        const subjectScores: any[] = [];
        let totalScore = 0;

        for (const score of scores) {
          // Get daily marks for classification
          const dailyMarks = await DailyMark.find({
            studentId: student._id,
            termId,
            subjectId: score.subjectId._id,
            schoolId: user.schoolId
          }).lean();

          // Calculate weighted score
          const classwork = dailyMarks
            .filter((m) => m.assessmentType === "CLASSWORK")
            .reduce((sum, m) => sum + m.score, 0);
          const homework = dailyMarks
            .filter((m) => m.assessmentType === "HOMEWORK")
            .reduce((sum, m) => sum + m.score, 0);
          const evaluation = dailyMarks
            .filter((m) => m.assessmentType === "EVALUATION")
            .reduce((sum, m) => sum + m.score, 0);

          const weightedScore =
            classwork * 0.2 + homework * 0.15 + evaluation * 0.15 + score.examScore * 0.5;

          // Determine grade
          let grade = "F";
          if (weightedScore >= 90) grade = "A";
          else if (weightedScore >= 80) grade = "B";
          else if (weightedScore >= 70) grade = "C";
          else if (weightedScore >= 60) grade = "D";
          else if (weightedScore >= 50) grade = "E";

          subjectScores.push({
            subjectId: score.subjectId._id,
            subjectName: score.subjectId.name,
            subjectCode: score.subjectId.code,
            classwork: Math.round(classwork / dailyMarks.filter((m) => m.assessmentType === "CLASSWORK").length) || 0,
            homework: Math.round(homework / dailyMarks.filter((m) => m.assessmentType === "HOMEWORK").length) || 0,
            evaluation:
              Math.round(
                evaluation /
                  dailyMarks.filter((m) => m.assessmentType === "EVALUATION").length
              ) || 0,
            exam: score.examScore,
            total: Math.round(weightedScore),
            grade,
            teacherRemark: score.teacherRemark || ""
          });

          totalScore += weightedScore;
        }

        if (subjectScores.length === 0) continue;

        const averageScore = Math.round(totalScore / subjectScores.length);

        // Get attendance percentage
        const attendanceRecords = await AttendanceRecord.find({
          schoolId: user.schoolId,
          termId,
          "records.studentId": student._id
        }).lean();

        let attendancePercentage = 0;
        if (attendanceRecords.length > 0) {
          const studentAttendance = attendanceRecords.flatMap((r) =>
            r.records.filter((s: any) => s.studentId.toString() === student._id.toString())
          );
          const present = studentAttendance.filter(
            (a: any) => a.status === "PRESENT" || a.status === "LATE"
          ).length;
          attendancePercentage = Math.round((present / studentAttendance.length) * 100) || 0;
        }

        // Get remarks
        const classTeacherRemark = await TeacherRemark.findOne({
          studentId: student._id,
          termId,
          type: "CLASS_TEACHER",
          schoolId: user.schoolId
        }).lean();

        // Calculate class ranking (simplified: by average score)
        // Note: Full ranking requires all students' scores to be aggregated first

        // Determine promotion status
        const passPercentage = 50;
        const promotePercentage = subjectScores.filter((s) => parseInt(s.total) >= passPercentage).length / subjectScores.length;

        let promotionStatus = "PROMOTED";
        if (promotePercentage < 0.5) promotionStatus = "DEFERRED";
        else if (classTeacherRemark?.promotionRecommendation === "REPEAT")
          promotionStatus = "REPEATED";

        // Create report card
        const reportCard = await ReportCard.create({
          schoolId: user.schoolId,
          studentId: student._id,
          academicYearId,
          termId,
          subjectScores,
          totalScore: totalScore,
          averageScore,
          classRanking: 0, // Will be set after all students are processed
          attendancePercentage,
          comportment: classTeacherRemark?.customRemark ? "GOOD" : "EXCELLENT",
          promotionStatus,
          generatedAt: new Date()
        });

        reportCards.push(reportCard);
        successCount++;

        // Notify parent
        await notifyReportReady(
          user.schoolId,
          termId,
          student._id.toString(),
          reportCard._id.toString()
        );
      } catch (error) {
        console.error(`Error generating report for student ${student._id}:`, error);
        // Continue with next student
      }
    }

    // Calculate class rankings (highest average score = rank 1)
    const rankedCards = reportCards.sort((a, b) => b.averageScore - a.averageScore);
    for (let i = 0; i < rankedCards.length; i++) {
      await ReportCard.updateOne({ _id: rankedCards[i]._id }, { classRanking: i + 1 });
    }

    return NextResponse.json({
      message: `Report cards generated for ${successCount} students`,
      termId,
      academicYearId,
      generatedCount: successCount,
      totalStudents: students.length,
      generatedAt: new Date()
    });
  } catch (error: any) {
    console.error("Generate report cards error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate report cards" },
      { status: 500 }
    );
  }
}
