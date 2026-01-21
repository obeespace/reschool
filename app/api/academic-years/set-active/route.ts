import connectDB from "@/app/utils/db";
import AcademicYear from "@/app/models/AcademicYear";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: any = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { academicYearId } = await req.json();

    if (!academicYearId) {
      return NextResponse.json(
        { error: "Academic year ID is required" },
        { status: 400 }
      );
    }

    // Deactivate all academic years for this school
    await AcademicYear.updateMany(
      { schoolId: admin.schoolId },
      { isActive: false }
    );

    // Activate the specified academic year
    const academicYear = await AcademicYear.findOneAndUpdate(
      { _id: academicYearId, schoolId: admin.schoolId },
      { isActive: true },
      { new: true }
    );

    if (!academicYear) {
      return NextResponse.json(
        { error: "Academic year not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Active academic year updated",
      academicYear: {
        id: academicYear._id.toString(),
        name: academicYear.name,
        isActive: academicYear.isActive
      }
    });
  } catch (error: any) {
    console.error("Set active academic year error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set active academic year" },
      { status: 500 }
    );
  }
}
