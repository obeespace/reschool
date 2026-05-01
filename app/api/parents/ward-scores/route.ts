import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ParentWardLink from "@/app/models/ParentWardLink";
import DailyMark from "@/app/models/DailyMark";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const parent: ITokenPayload | null = verifyToken(token || "");
    if (!parent || parent.role !== "PARENT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(parent.schoolId);
    const parentId = new mongoose.Types.ObjectId(parent.userId);

    const wardLinks = await ParentWardLink.find({ schoolId, parentId }).lean();
    const wardIds = wardLinks.map((w) => w.studentId);
    if (!wardIds.length) return NextResponse.json({ wards: [] });

    const termId = searchParams.get("termId");
    const termFilter = termId
      ? await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termId) }).lean()
      : await Term.findOne({ schoolId, isActive: true }).lean();

    const students = await Student.find({ schoolId, _id: { $in: wardIds } }).lean();
    const studentMap = new Map(students.map((s) => [s._id.toString(), s]));

    const marks = termFilter
      ? await DailyMark.aggregate([
          { $match: { schoolId, studentId: { $in: wardIds }, termId: termFilter._id } },
          { $group: { _id: { studentId: "$studentId", subjectId: "$subjectId" }, avg: { $avg: "$score" }, max: { $max: "$score" }, count: { $sum: 1 } } },
        ])
      : [];

    const subjectIds = [...new Set(marks.map((m) => m._id.subjectId.toString()))];
    const subjects = subjectIds.length ? await Subject.find({ _id: { $in: subjectIds } }).lean() : [];
    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), s.name]));

    const byStudent = new Map<string, { studentId: string; fullName: string; scores: Array<{subjectId: string; subjectName: string; avg: number; max: number; count: number}> }>();
    for (const sid of wardIds) {
      byStudent.set(sid.toString(), { studentId: sid.toString(), fullName: studentMap.get(sid.toString())?.fullName || "Unknown", scores: [] });
    }
    for (const m of marks) {
      const sid = m._id.studentId.toString();
      byStudent.get(sid)?.scores.push({
        subjectId: m._id.subjectId.toString(),
        subjectName: subjectMap.get(m._id.subjectId.toString()) || "Unknown",
        avg: Math.round(m.avg),
        max: m.max,
        count: m.count,
      });
    }

    return NextResponse.json({ wards: [...byStudent.values()], termId: termFilter?._id.toString() || null });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch ward scores" }, { status: 500 });
  }
}
