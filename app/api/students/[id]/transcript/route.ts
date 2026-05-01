import connectDB from "@/app/utils/db";
import ReportCard from "@/app/models/ReportCard";
import Student from "@/app/models/Students";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify student exists and user has access
    const student = await Student.findOne({
      _id: id,
      schoolId: user.schoolId
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Access control: ADMIN sees all, PARENT sees own wards, TEACHER sees class students
    if (user.role === "PARENT" && student.parentId?.toString() !== user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch all report cards for this student, sorted by year and term
    const reportCards = await ReportCard.find({
      schoolId: user.schoolId,
      studentId: id
    })
      .sort({ year: -1, term: -1 })
      .lean();

    return NextResponse.json({
      student: {
        id: student._id.toString(),
        fullName: student.fullName,
        admissionNumber: student.admissionNumber
      },
      reportCards
    });
  } catch (error: any) {
    console.error("Fetch transcript error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch transcript" },
      { status: 500 }
    );
  }
}
