import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Timetable from "@/app/models/Timetable";
import Class from "@/app/models/Class";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

// GET /api/timetable?classId=&termId=
export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const termId = searchParams.get("termId");

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    if (classId && termId) {
      const timetable = await Timetable.findOne({
        schoolId,
        classId: new mongoose.Types.ObjectId(classId),
        termId: new mongoose.Types.ObjectId(termId),
      }).lean();
      return NextResponse.json({ timetable: timetable || null });
    }

    // Return all timetables for the school/term
    const query: Record<string, unknown> = { schoolId };
    if (termId) query.termId = new mongoose.Types.ObjectId(termId);
    const timetables = await Timetable.find(query).lean();
    return NextResponse.json({ timetables });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch timetable" }, { status: 500 });
  }
}

// POST /api/timetable — save or replace timetable for a class/term
export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const { classId, termId, schedule } = body;
    if (!classId || !termId || !Array.isArray(schedule)) {
      return NextResponse.json({ error: "classId, termId, and schedule[] are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const cls = await Class.findOne({ schoolId, _id: new mongoose.Types.ObjectId(classId) }).lean();
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const term = await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termId) }).lean();
    if (!term) return NextResponse.json({ error: "Term not found" }, { status: 404 });

    const className = `${(cls as { level: string }).level} ${(cls as { arm: string }).arm}`;
    const userId = new mongoose.Types.ObjectId(admin.userId);

    const timetable = await Timetable.findOneAndUpdate(
      { schoolId, classId: new mongoose.Types.ObjectId(classId), termId: new mongoose.Types.ObjectId(termId) },
      {
        $set: {
          className,
          academicYearId: term.academicYearId,
          schedule,
          lastUpdatedBy: userId,
        },
        $setOnInsert: { createdBy: userId },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: "Timetable saved", timetable });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save timetable" }, { status: 500 });
  }
}
