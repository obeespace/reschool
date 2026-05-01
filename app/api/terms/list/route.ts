import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Term from "@/app/models/Term";
import AcademicYear from "@/app/models/AcademicYear";
import mongoose from "mongoose";
import { getOrSetServerCache, shouldBypassServerCache } from "@/app/utils/serverCache";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");
    const onlyPaid = searchParams.get("onlyPaid") === "true";
    const bypassCache = shouldBypassServerCache(req);
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const payload = await getOrSetServerCache({
      key: `terms:list:${user.schoolId}:${academicYearId || "all"}:${onlyPaid ? "paid" : "all"}`,
      ttlMs: 15_000,
      bypass: bypassCache,
      factory: async () => {
        const filter: Record<string, unknown> = { schoolId };
        if (academicYearId) filter.academicYearId = new mongoose.Types.ObjectId(academicYearId);
        if (onlyPaid) filter.isPaid = true;

        const dbTerms = await Term.find(filter).sort({ startDate: -1 }).lean();
        const yearIds = [...new Set(dbTerms.map((t) => (t.academicYearId as mongoose.Types.ObjectId).toString()))];
        const dbYears = yearIds.length
          ? await AcademicYear.find({ _id: { $in: yearIds } }).select("name").lean()
          : [];
        const yearMap = new Map(dbYears.map((y) => [(y._id as mongoose.Types.ObjectId).toString(), y.name]));

        return {
          terms: dbTerms.map((t) => ({
            _id: (t._id as mongoose.Types.ObjectId).toString(),
            id: (t._id as mongoose.Types.ObjectId).toString(),
            schoolId: (t.schoolId as mongoose.Types.ObjectId).toString(),
            academicYearId: yearMap.has((t.academicYearId as mongoose.Types.ObjectId).toString())
              ? { _id: (t.academicYearId as mongoose.Types.ObjectId).toString(), name: yearMap.get((t.academicYearId as mongoose.Types.ObjectId).toString()) }
              : null,
            termNumber: t.termNumber,
            startDate: t.startDate,
            endDate: t.endDate,
            isActive: t.isActive,
            isPaid: t.isPaid,
            isClosed: t.isClosed,
            paymentDate: t.paymentDate,
            paymentReference: t.paymentReference,
          })),
        };
      },
    });

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
    });
  } catch (error: unknown) {
    console.error("Fetch terms error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch terms" },
      { status: 500 }
    );
  }
}
