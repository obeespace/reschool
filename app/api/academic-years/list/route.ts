import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AcademicYear from "@/app/models/AcademicYear";
import Term from "@/app/models/Term";
import mongoose from "mongoose";
import { getOrSetServerCache, shouldBypassServerCache } from "@/app/utils/serverCache";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const bypassCache = shouldBypassServerCache(req);
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const payload = await getOrSetServerCache({
      key: `academic-years:list:${user.schoolId}`,
      ttlMs: 20_000,
      bypass: bypassCache,
      factory: async () => {
        const [dbYears, activeTerms] = await Promise.all([
          AcademicYear.find({ schoolId }).sort({ startDate: -1 }).lean(),
          Term.find({ schoolId, isActive: true }).select("academicYearId termNumber").lean(),
        ]);

        const activeTermByYear = new Map(
          activeTerms.map((t) => [(t.academicYearId as mongoose.Types.ObjectId).toString(), t.termNumber])
        );

        return {
          academicYears: dbYears.map((y) => ({
            id: (y._id as mongoose.Types.ObjectId).toString(),
            name: y.name,
            startDate: y.startDate,
            endDate: y.endDate,
            isActive: y.isActive,
            term: activeTermByYear.get((y._id as mongoose.Types.ObjectId).toString()) ?? 1,
          })),
        };
      },
    });

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
    });
  } catch (error: unknown) {
    console.error("Fetch academic years error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch academic years",
      },
      { status: 500 }
    );
  }
}