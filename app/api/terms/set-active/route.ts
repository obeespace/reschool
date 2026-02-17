import connectDB from "@/app/utils/db";
import Term from "@/app/models/Term";
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

    const { termId } = await req.json();

    if (!termId) {
      return NextResponse.json(
        { error: "Term ID is required" },
        { status: 400 }
      );
    }

    const term = await Term.findById(termId);

    if (!term || term.schoolId.toString() !== admin.schoolId) {
      return NextResponse.json(
        { error: "Term not found" },
        { status: 404 }
      );
    }

    // Deactivate all terms and academic years for this school
    await Term.updateMany(
      { schoolId: admin.schoolId, isActive: true },
      { isActive: false }
    );

    await AcademicYear.updateMany(
      { schoolId: admin.schoolId, isActive: true },
      { isActive: false }
    );

    // Activate this term
    term.isActive = true;
    await term.save();

    // Activate the corresponding academic year
    await AcademicYear.findByIdAndUpdate(
      term.academicYearId,
      { isActive: true, term: term.termNumber }
    );

    return NextResponse.json({
      message: "Term activated successfully",
      termId: term._id.toString()
    });
  } catch (error: any) {
    console.error("Set active term error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set active term" },
      { status: 500 }
    );
  }
}
