import connectDB from "@/app/utils/db";
import Term from "@/app/models/Term";
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
      parentId: parent.userId
    });

    if (students.length === 0) {
      return NextResponse.json({ terms: [] });
    }

    const studentIds = students.map((s) => s._id);

    // Get unique academic years where these students have records
    const classHistories = await StudentClassHistory.find({
      schoolId: parent.schoolId,
      studentId: { $in: studentIds }
    }).distinct("academicYearId");

    // Fetch all paid terms for these academic years (parents can only access paid terms)
    const terms = await Term.find({
      schoolId: parent.schoolId,
      academicYearId: { $in: classHistories },
      isPaid: true
    })
      .populate("academicYearId", "name")
      .sort({ startDate: -1 });

    return NextResponse.json({
      terms: terms.map(term => ({
        id: term._id.toString(),
        academicYear: (term.academicYearId as any)?.name || "N/A",
        academicYearId: term.academicYearId.toString(),
        termNumber: term.termNumber,
        startDate: term.startDate,
        endDate: term.endDate,
        isActive: term.isActive,
        isPaid: term.isPaid,
        isClosed: term.isClosed
      }))
    });
  } catch (error: any) {
    console.error("Fetch academic years error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch academic years" },
      { status: 500 }
    );
  }
}
