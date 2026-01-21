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

    const { name, startDate, endDate, setAsActive } = await req.json();

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Name, start date, and end date are required" },
        { status: 400 }
      );
    }

    // If setting as active, deactivate all other academic years for this school
    if (setAsActive) {
      await AcademicYear.updateMany(
        { schoolId: admin.schoolId, isActive: true },
        { isActive: false }
      );
    }

    const academicYear = await AcademicYear.create({
      schoolId: admin.schoolId,
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: setAsActive || false,
      term: 1
    });

    return NextResponse.json({
      academicYearId: academicYear._id.toString(),
      message: "Academic year created successfully"
    });
  } catch (error: any) {
    console.error("Academic year creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create academic year" },
      { status: 500 }
    );
  }
}
