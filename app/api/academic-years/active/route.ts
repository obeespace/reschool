import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AcademicYear from "@/app/models/AcademicYear";
import Term from "@/app/models/Term";
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

    const activeYear = await AcademicYear.findOne({ schoolId, isActive: true }).lean();

    if (!activeYear) {
      return NextResponse.json({
        academicYear: null,
        message: "No active academic year found",
      });
    }

    const activeTerm = await Term.findOne({
      schoolId,
      academicYearId: activeYear._id,
      isActive: true,
    }).select("termNumber").lean();

    return NextResponse.json({
      academicYear: {
        _id: (activeYear._id as mongoose.Types.ObjectId).toString(),
        name: activeYear.name,
        startDate: activeYear.startDate,
        endDate: activeYear.endDate,
        isActive: activeYear.isActive,
        term: activeTerm?.termNumber ?? 1,
      },
    });
  } catch (error: unknown) {
    console.error("Fetch active academic year error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch active academic year",
      },
      { status: 500 }
    );
  }
}