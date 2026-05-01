import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AttendanceRecord from "@/app/models/AttendanceRecord";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    if (!activeTerm) return NextResponse.json({ stats: { totalDays: 0, presentCount: 0, absentCount: 0, lateCount: 0, attendanceRate: 0 } });

    const classId = searchParams.get("classId");
    const filter: Record<string, unknown> = { schoolId, termId: activeTerm._id };
    if (classId) filter.classId = new mongoose.Types.ObjectId(classId);

    const records = await AttendanceRecord.find(filter).lean();
    const totalDays = new Set(records.map((r) => r.attendanceDate.toISOString().split("T")[0])).size;

    let present = 0, absent = 0, late = 0;
    for (const rec of records) {
      for (const r of rec.records || []) {
        if (r.status === "PRESENT") present++;
        else if (r.status === "ABSENT") absent++;
        else if (r.status === "LATE") late++;
      }
    }

    const total = present + absent + late;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    return NextResponse.json({
      stats: { totalDays, presentCount: present, absentCount: absent, lateCount: late, attendanceRate },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch attendance dashboard" }, { status: 500 });
  }
}
