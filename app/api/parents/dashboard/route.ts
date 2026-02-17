import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
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

    const activeTerm = await Term.findOne({
      schoolId: user.schoolId,
      isActive: true
    }).populate("academicYearId", "name").lean();

    const wardIds = wards.map((w: any) => w._id);

    const reportsAvailable = activeTerm && activeTerm.isPaid
      ? await Score.countDocuments({
          academicYearId: activeTerm.academicYearId,
          term: activeTerm.termNumber,
          studentId: { $in: wardIds }
        })
      : 0;

    const termLabel = activeTerm
      ? `${activeTerm.termNumber}${activeTerm.termNumber === 1 ? "st" : activeTerm.termNumber === 2 ? "nd" : "rd"} Term`
      : "N/A";

    return NextResponse.json({
      wards,
      stats: {
        wardsCount: wards.length,
        activeTerm: termLabel,
        reportsAvailable,
        termPaid: activeTerm?.isPaid || false
      },
      activeTerm: activeTerm
        ? { 
            academicYear: (activeTerm.academicYearId as any)?.name || "N/A",
            term: activeTerm.termNumber,
            isPaid: activeTerm.isPaid,
            isClosed: activeTerm.isClosed
          }
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
