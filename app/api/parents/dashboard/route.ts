import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import AcademicYear from "@/app/models/AcademicYear";
import Score from "@/app/models/Score";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");

    if (!user || user.role !== "PARENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const wards = await Student.find({ parentId: user.userId })
      .populate("currentClassId", "level arm")
      .lean();

    const activeYear = await AcademicYear.findOne({
      schoolId: user.schoolId,
      isActive: true
    }).lean();

    const wardIds = wards.map((w: any) => w._id);

    const reportsAvailable = activeYear
      ? await Score.countDocuments({
          academicYearId: activeYear._id,
          term: activeYear.term,
          studentId: { $in: wardIds }
        })
      : 0;

    const termLabel = activeYear?.term
      ? `${activeYear.term}${activeYear.term === 1 ? "st" : activeYear.term === 2 ? "nd" : "rd"} Term`
      : "N/A";

    return NextResponse.json({
      wards,
      stats: {
        wardsCount: wards.length,
        activeTerm: termLabel,
        reportsAvailable
      },
      activeYear: activeYear
        ? { name: activeYear.name, term: activeYear.term }
        : null
    });
  } catch (error: any) {
    console.error("Parent dashboard error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch parent dashboard" },
      { status: 500 }
    );
  }
}
