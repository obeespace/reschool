import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AttendanceRecord from "@/app/models/AttendanceRecord";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    const filter: Record<string, unknown> = { schoolId };
    if (activeTerm) filter.termId = activeTerm._id;
    const classId = searchParams.get("classId");
    if (classId) filter.classId = new mongoose.Types.ObjectId(classId);
    const records = await AttendanceRecord.find(filter).lean();
    const studentIds = [...new Set(records.flatMap((r) => r.records.map((e: {studentId: mongoose.Types.ObjectId}) => e.studentId.toString())))];
    const students = studentIds.length ? await Student.find({ _id: { $in: studentIds } }).select("_id fullName admissionNumber").lean() : [];
    const studentMap = new Map(students.map((s) => [s._id.toString(), s]));
    const rows = records.flatMap((rec) => rec.records.map((r: {studentId: mongoose.Types.ObjectId; status: string}) => {
      const s = studentMap.get(r.studentId.toString());
      return { date: rec.attendanceDate, classId: rec.classId.toString(), studentId: r.studentId.toString(), studentName: s?.fullName || "Unknown", admissionNumber: s?.admissionNumber || "", status: r.status };
    }));
    return NextResponse.json({ data: rows });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 });
  }
}
