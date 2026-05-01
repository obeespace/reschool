import connectDB from "@/app/utils/db";
import AcademicYear from "@/app/models/AcademicYear";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Find the active academic year for this school
    const academicYear = await AcademicYear.findOne({
      schoolId: user.schoolId,
      isActive: true
    }).lean();

    if (!academicYear) {
      return NextResponse.json({
        academicYear: null,
        message: "No active academic year found"
      });
    }

    return NextResponse.json({
      academicYear: {
        _id: academicYear._id,
        name: academicYear.name,
        startDate: academicYear.startDate,
        endDate: academicYear.endDate,
        isActive: academicYear.isActive,
        term: academicYear.term
      }
    });
  } catch (error: any) {
    console.error("Fetch active academic year error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch active academic year" },
      { status: 500 }
    );
  }
}
