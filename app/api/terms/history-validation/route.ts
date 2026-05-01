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
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const years = await AcademicYear.find({ schoolId }).lean();
    const terms = await Term.find({ schoolId }).lean();

    const termsByYear = new Map<string, typeof terms>();
    for (const t of terms) {
      const key = t.academicYearId.toString();
      if (!termsByYear.has(key)) termsByYear.set(key, []);
      termsByYear.get(key)!.push(t);
    }

    const history = years.map((y) => {
      const yearTerms = (termsByYear.get((y as {_id: mongoose.Types.ObjectId})._id.toString()) || []).sort(
        (a, b) => a.termNumber - b.termNumber
      );
      const valid = yearTerms.every((t, i, arr) => {
        if (i === 0) return true;
        return arr[i - 1].isClosed || !t.isActive;
      });
      return {
        _id: (y as {_id: mongoose.Types.ObjectId})._id.toString(),
        name: (y as {name: string}).name,
        isActive: (y as {isActive: boolean}).isActive,
        terms: yearTerms.map((t) => ({
          _id: (t as {_id: mongoose.Types.ObjectId})._id.toString(),
          termNumber: t.termNumber,
          isActive: t.isActive,
          isPaid: t.isPaid,
          isClosed: t.isClosed,
        })),
        valid,
      };
    });

    return NextResponse.json({ history });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch term history" }, { status: 500 });
  }
}
