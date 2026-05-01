import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import Student from "@/app/models/Students";
import "@/app/models/Subject";
import "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user || user.role !== "PARENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");

    // Get all wards (students) for this parent
    const wards = await Student.find({ parentId: user.userId }).select("_id");
    const wardIds = wards.map(w => w._id);

    if (wardIds.length === 0) {
      return NextResponse.json({ dailyMarks: [] });
    }

    const query: any = {
      schoolId: user.schoolId,
      studentId: { $in: wardIds }
    };

    if (academicYearId) query.academicYearId = academicYearId;

    const dailyMarks = await DailyMark.find(query)
      .populate("studentId", "fullName admissionNumber")
      .populate("subjectId", "name code")
      .populate("teacherId", "fullName")
      .sort({ date: -1 })
      .lean();

    // Group by student and type
    const groupedMarks: any = {};
    dailyMarks.forEach((mark: any) => {
      const studentId = mark.studentId._id;
      if (!groupedMarks[studentId]) {
        groupedMarks[studentId] = {
          student: mark.studentId,
          byType: {
            classwork: [],
            homework: [],
            test: [],
            extracurricular: []
          }
        };
      }
      groupedMarks[studentId].byType[mark.type].push(mark);
    });

    return NextResponse.json({
      dailyMarks: Object.values(groupedMarks),
      total: dailyMarks.length
    });

  } catch (error: any) {
    console.error("Error fetching parent daily marks:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch daily marks" },
      { status: 500 }
    );
  }
}
