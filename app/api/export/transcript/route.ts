import connectDB from "@/app/utils/db";
import ReportCard from "@/app/models/ReportCard";
import Students from "@/app/models/Students";
import Certificate from "@/app/models/Certificate";
import "@/app/models/Term";
import "@/app/models/AcademicYear";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

/**
 * Export Student Transcript as CSV
 * Download all report cards for a student in CSV format
 * Access: ADMIN, PARENT (own ward), TEACHER (class students)
 */

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
    const format = searchParams.get("format") || "csv"; // csv | json

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const student = await Students.findOne({
      _id: studentId,
      schoolId: user.schoolId
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Access control
    if (user.role === "PARENT" && student.parentId.toString() !== user.id) {
      return NextResponse.json(
        { error: "Cannot access another student's transcript" },
        { status: 403 }
      );
    }

    // Fetch all report cards
    const reportCards = await ReportCard.find({
      studentId,
      schoolId: user.schoolId
    })
      .populate("termId", "name year")
      .populate("academicYearId", "year")
      .sort({ "academicYearId.year": -1, "termId.name": -1 })
      .lean();

    if (format === "json") {
      return NextResponse.json({
        student: {
          id: student._id,
          name: student.fullName,
          studentId: student.studentId,
          class: student.currentClass
        },
        reportCards: reportCards.map((rc: any) => ({
          year: rc.academicYearId?.year,
          term: rc.termId?.name,
          averageScore: rc.averageScore,
          classRanking: rc.classRanking,
          attendance: rc.attendancePercentage,
          subjects: rc.subjectScores.map((s: any) => ({
            subject: s.subjectName,
            classwork: s.classwork,
            homework: s.homework,
            evaluation: s.evaluation,
            exam: s.exam,
            total: s.total,
            grade: s.grade
          })),
          promotionStatus: rc.promotionStatus
        }))
      });
    }

    // CSV format
    let csv = `Student Transcript - ${student.fullName}\n`;
    csv += `Student ID: ${student.studentId}\n`;
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;

    reportCards.forEach((rc: any) => {
      csv += `\n${rc.academicYearId?.year} - ${rc.termId?.name}\n`;
      csv += "Subject,Classwork,Homework,Evaluation,Exam,Total,Grade\n";
      rc.subjectScores.forEach((s: any) => {
        csv += `${s.subjectName},${s.classwork},${s.homework},${s.evaluation},${s.exam},${s.total},${s.grade}\n`;
      });
      csv += `Average Score: ${rc.averageScore}, Class Rank: ${rc.classRanking}, Attendance: ${rc.attendancePercentage}%, Promotion: ${rc.promotionStatus}\n`;
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="transcript_${student.studentId}.csv"`
      }
    });
  } catch (error: any) {
    console.error("Export transcript error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export transcript" },
      { status: 500 }
    );
  }
}
