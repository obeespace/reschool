import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import "@/app/models/Students";
import "@/app/models/Subject";
import "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

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
    const academicYearId = searchParams.get("academicYearId");
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const type = searchParams.get("type");

    // Build query - always filter by school
    const query: any = { schoolId: user.schoolId };

    // Teachers can only see their own daily marks
    if (user.role === "TEACHER") {
      query.teacherId = user.userId;
    }

    if (studentId) query.studentId = studentId;
    if (academicYearId) query.academicYearId = academicYearId;
    if (classId) query.classId = classId;
    if (subjectId) query.subjectId = subjectId;
    if (type) {
      const typeToAssessment: Record<string, string> = {
        classwork: "CLASSWORK",
        homework: "HOMEWORK",
        test: "EVALUATION",
        extracurricular: "EVALUATION",
        exam: "EXAM"
      };
      query.assessmentType = typeToAssessment[type] || type;
    }

    const dailyMarks = await DailyMark.find(query)
      .populate("studentId", "fullName admissionNumber")
      .populate("subjectId", "name code")
      .populate("teacherId", "fullName")
      .sort({ recordedDate: -1 })
      .lean();

    const normalizedDailyMarks = dailyMarks.map((mark: any) => {
      const assessmentToType: Record<string, string> = {
        CLASSWORK: "classwork",
        HOMEWORK: "homework",
        EVALUATION: "test",
        EXAM: "exam"
      };

      return {
        ...mark,
        type: mark.type || assessmentToType[mark.assessmentType] || "classwork",
        date: mark.date || mark.recordedDate
      };
    });

    return NextResponse.json({
      dailyMarks: normalizedDailyMarks,
      total: normalizedDailyMarks.length
    });

  } catch (error: any) {
    console.error("Error fetching daily marks:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch daily marks" },
      { status: 500 }
    );
  }
}
