import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AcademicYear from "@/app/models/AcademicYear";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const parent: ITokenPayload | null = verifyToken(token || "");
    if (!parent || parent.role !== "PARENT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(parent.schoolId);

    const years = await AcademicYear.find({ schoolId }).sort({ createdAt: -1 }).lean();
    const terms = await Term.find({ schoolId }).lean();
    const termsByYear = new Map<string, typeof terms>();
    for (const t of terms) {
      const key = t.academicYearId.toString();
      if (!termsByYear.has(key)) termsByYear.set(key, []);
      termsByYear.get(key)!.push(t);
    }

    return NextResponse.json({
      academicYears: years.map((y) => ({
        _id: y._id.toString(),
        name: y.name,
        isActive: y.isActive,
        terms: (termsByYear.get(y._id.toString()) || []).map((t) => ({
          _id: t._id.toString(),
          termNumber: t.termNumber,
          isActive: t.isActive,
          isPaid: t.isPaid,
          isClosed: t.isClosed,
        })),
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch academic years" }, { status: 500 });
  }
}
