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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const [years, terms] = await Promise.all([
      AcademicYear.find({ schoolId }).sort({ startDate: -1 }).lean(),
      Term.find({ schoolId }).sort({ startDate: -1 }).lean(),
    ]);

    const yearMap = new Map(
      years.map((y) => [
        (y._id as mongoose.Types.ObjectId).toString(),
        {
          id: (y._id as mongoose.Types.ObjectId).toString(),
          name: y.name,
          isActive: y.isActive,
          startDate: y.startDate,
          endDate: y.endDate,
        },
      ])
    );

    const activeTerm = terms.find((t) => t.isActive);

    return NextResponse.json({
      academicYears: Array.from(yearMap.values()),
      terms: terms.map((t) => ({
        id: (t._id as mongoose.Types.ObjectId).toString(),
        termNumber: t.termNumber,
        academicYearId: (t.academicYearId as mongoose.Types.ObjectId).toString(),
        academicYearName:
          yearMap.get((t.academicYearId as mongoose.Types.ObjectId).toString())?.name ||
          "Unknown Session",
        isActive: t.isActive,
        isClosed: t.isClosed,
        startDate: t.startDate,
        endDate: t.endDate,
      })),
      activeTermId: activeTerm ? (activeTerm._id as mongoose.Types.ObjectId).toString() : null,
      activeAcademicYearId: activeTerm
        ? (activeTerm.academicYearId as mongoose.Types.ObjectId).toString()
        : null,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch archive options" },
      { status: 500 }
    );
  }
}
