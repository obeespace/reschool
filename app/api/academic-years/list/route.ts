import connectDB from "@/app/utils/db";
import AcademicYear from "@/app/models/AcademicYear";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const academicYears = await AcademicYear.find({ schoolId: user.schoolId })
      .sort({ startDate: -1 });

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
    console.error("Fetch academic years error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch academic years" },
      { status: 500 }
    );
  }
}
