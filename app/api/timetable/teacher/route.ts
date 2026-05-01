import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Timetable from "@/app/models/Timetable";
import mongoose from "mongoose";

// GET /api/timetable/teacher — teacher's own schedule across all their classes this term
export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const termId = searchParams.get("termId");
    if (!termId) return NextResponse.json({ error: "termId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const teacherId = new mongoose.Types.ObjectId(user.userId);

    const allTimetables = await Timetable.find({
      schoolId,
      termId: new mongoose.Types.ObjectId(termId),
    }).lean();

    // Filter to only periods that belong to this teacher
    const result = allTimetables.map((t) => ({
      classId: t.classId,
      className: t.className,
      schedule: (t.schedule || []).map((day: { day: string; periods: { teacherId?: unknown }[] }) => ({
        day: day.day,
        periods: (day.periods || []).filter(
          (p: { teacherId?: unknown }) => p.teacherId?.toString() === teacherId.toString()
        ),
      })).filter((day: { day: string; periods: unknown[] }) => day.periods.length > 0),
    })).filter((t) => t.schedule.length > 0);

    return NextResponse.json({ schedule: result });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch teacher timetable" }, { status: 500 });
  }
}
