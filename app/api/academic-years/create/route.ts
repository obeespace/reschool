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

    const { name, startDate, endDate, setAsActive } = await req.json();
    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Name, start date, and end date are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (setAsActive) {
      await AcademicYear.updateMany({ schoolId }, { isActive: false });
      await Term.updateMany({ schoolId }, { isActive: false });
    }

    const academicYear = await AcademicYear.create({
      schoolId,
      name,
      startDate: start,
      endDate: end,
      isActive: !!setAsActive,
      term: 1,
    });

    const totalDays = Math.max(3, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const termDurationDays = Math.max(1, Math.floor(totalDays / 3));
    const createdTerms: Array<{ termId: string; termNumber: number; startDate: Date; endDate: Date }> = [];

    for (let termNumber = 1; termNumber <= 3; termNumber++) {
      const termStart = new Date(start);
      termStart.setDate(start.getDate() + (termNumber - 1) * termDurationDays);

      const termEnd = new Date(start);
      if (termNumber === 3) {
        termEnd.setTime(end.getTime());
      } else {
        termEnd.setDate(start.getDate() + termNumber * termDurationDays - 1);
      }

      const term = await Term.create({
        schoolId,
        academicYearId: academicYear._id,
        termNumber,
        startDate: termStart,
        endDate: termEnd,
        isActive: !!setAsActive && termNumber === 1,
        isPaid: false,
        isClosed: false,
      });

      createdTerms.push({
        termId: (term._id as mongoose.Types.ObjectId).toString(),
        termNumber,
        startDate: termStart,
        endDate: termEnd,
      });
    }

    invalidateServerCacheByPrefix(`academic-years:list:${admin.schoolId}`);
    invalidateServerCacheByPrefix(`terms:list:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`admin:stats:${admin.schoolId}`);

    return NextResponse.json({
      academicYearId: (academicYear._id as mongoose.Types.ObjectId).toString(),
      terms: createdTerms,
      message: "Academic year and 3 terms created successfully",
    });
  } catch (error: unknown) {
    console.error("Academic year creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create academic year" },
      { status: 500 }
    );
  }
}