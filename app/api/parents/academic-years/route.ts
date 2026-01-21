import connectDB from "@/app/utils/db";
import AcademicYear from "@/app/models/AcademicYear";
import Student from "@/app/models/Students";
import StudentClassHistory from "@/app/models/StudentClassHistory";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const parent: any = verifyToken(token || "");

    if (!parent || parent.role !== "PARENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all children of this parent
    const students = await Student.find({
      schoolId: parent.schoolId,
      parentId: parent.id
    });

    if (students.length === 0) {
      return NextResponse.json({ academicYears: [] });
    }

    const studentIds = students.map((s) => s._id);

    // Get unique academic years where these students have records
    const classHistories = await StudentClassHistory.find({
      schoolId: parent.schoolId,
      studentId: { $in: studentIds }
    }).distinct("academicYearId");

    // Fetch the academic year details
    const academicYears = await AcademicYear.find({
      _id: { $in: classHistories }
    }).sort({ startDate: -1 });

    return NextResponse.json({
      academicYears: academicYears.map(year => ({
        id: year._id.toString(),
        name: year.name,
        startDate: year.startDate,
        endDate: year.endDate,
        isActive: year.isActive,
        term: year.term
      }))
    });
  } catch (error: any) {
    console.error("Fetch parent academic years error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch academic years" },
      { status: 500 }
    );
  }
}
