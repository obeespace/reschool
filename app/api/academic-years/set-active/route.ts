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

    const { academicYearId } = await req.json();
    if (!academicYearId) {
      return NextResponse.json({ error: "Academic year ID is required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    await AcademicYear.updateMany({ schoolId }, { isActive: false });
    await Term.updateMany({ schoolId }, { isActive: false });

    const activated = await AcademicYear.findOneAndUpdate(
      { _id: academicYearId, schoolId },
      { isActive: true },
      { new: true }
    );

    if (!activated) {
      return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
    }

    const firstTerm = await Term.findOne({ schoolId, academicYearId }).sort({ termNumber: 1 });
    if (firstTerm) {
      firstTerm.isActive = true;
      await firstTerm.save();
    }

    invalidateServerCacheByPrefix(`academic-years:list:${admin.schoolId}`);
    invalidateServerCacheByPrefix(`terms:list:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`admin:stats:${admin.schoolId}`);
    invalidateServerCacheByPrefix(`reports:list:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`parents:dashboard:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`parents:class-ranking:${admin.schoolId}:`);

    return NextResponse.json({
      message: "Active academic year updated",
      academicYear: {
        id: (activated._id as mongoose.Types.ObjectId).toString(),
        name: activated.name,
        isActive: activated.isActive,
      },
    });
  } catch (error: unknown) {
    console.error("Set active academic year error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set active academic year" },
      { status: 500 }
    );
  }
}
