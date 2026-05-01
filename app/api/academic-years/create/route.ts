import connectDB from "@/app/utils/db";
import AcademicYear from "@/app/models/AcademicYear";
import Term from "@/app/models/Term";
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

    // If setting as active, deactivate all other academic years and terms for this school
    if (setAsActive) {
      await AcademicYear.updateMany(
        { schoolId: admin.schoolId, isActive: true },
        { isActive: false }
      );
      await Term.updateMany(
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

    // Automatically create 3 terms for this academic year
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const termDurationDays = Math.floor(totalDays / 3);

    const terms = [];
    for (let termNumber = 1; termNumber <= 3; termNumber++) {
      const termStart = new Date(start);
      termStart.setDate(start.getDate() + (termNumber - 1) * termDurationDays);
      
      const termEnd = new Date(start);
      if (termNumber === 3) {
        // Last term ends on academic year end date
        termEnd.setTime(end.getTime());
      } else {
        termEnd.setDate(start.getDate() + termNumber * termDurationDays - 1);
      }

      const term = await Term.create({
        schoolId: admin.schoolId,
        academicYearId: academicYear._id,
        termNumber,
        startDate: termStart,
        endDate: termEnd,
        isActive: setAsActive && termNumber === 1, // Only first term active if academic year is active
        isPaid: false,
        isClosed: false
      });

      terms.push({
        termId: term._id.toString(),
        termNumber: term.termNumber,
        startDate: term.startDate,
        endDate: term.endDate
      });
    }

    return NextResponse.json({
      academicYearId: academicYear._id.toString(),
      terms,
      message: "Academic year and 3 terms created successfully"
    });
  } catch (error: any) {
    console.error("Academic year creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create academic year" },
      { status: 500 }
    );
  }
}
