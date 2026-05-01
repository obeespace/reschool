import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Term from "@/app/models/Term";
import AcademicYear from "@/app/models/AcademicYear";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();

    if (!activeTerm) {
      return NextResponse.json({ error: "No active term found" }, { status: 404 });
    }

    const academicYear = await AcademicYear.findById(activeTerm.academicYearId).select("name").lean();

    return NextResponse.json({
      term: {
        ...activeTerm,
        _id: (activeTerm._id as mongoose.Types.ObjectId).toString(),
        academicYearId: academicYear
          ? { _id: (academicYear._id as mongoose.Types.ObjectId).toString(), name: academicYear.name }
          : null,
        isActive: activeTerm.isActive,
      },
      isPaid: activeTerm.isPaid,
      isClosed: activeTerm.isClosed,
    });
  } catch (error: unknown) {
    console.error("Fetch active term error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch active term" },
      { status: 500 }
    );
  }
}
