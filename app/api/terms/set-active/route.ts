import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AcademicYear from "@/app/models/AcademicYear";
import Term from "@/app/models/Term";
import mongoose from "mongoose";
import { invalidateServerCacheByPrefix } from "@/app/utils/serverCache";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { termId } = await req.json();
    if (!termId) {
      return NextResponse.json({ error: "Term ID is required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const targetTerm = await Term.findOne({ _id: termId, schoolId }).select("academicYearId").lean();
    if (!targetTerm) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    await Term.updateMany({ schoolId }, { isActive: false });
    await AcademicYear.updateMany({ schoolId }, { isActive: false });
    await Term.findByIdAndUpdate(termId, { isActive: true });
    await AcademicYear.findByIdAndUpdate(targetTerm.academicYearId, { isActive: true });

    invalidateServerCacheByPrefix(`terms:list:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`academic-years:list:${admin.schoolId}`);
    invalidateServerCacheByPrefix(`admin:stats:${admin.schoolId}`);
    invalidateServerCacheByPrefix(`reports:list:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`parents:dashboard:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`parents:class-ranking:${admin.schoolId}:`);

    return NextResponse.json({ message: "Term activated successfully", termId });
  } catch (error: unknown) {
    console.error("Set active term error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set active term" },
      { status: 500 }
    );
  }
}
