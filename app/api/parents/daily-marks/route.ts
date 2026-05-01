import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ParentWardLink from "@/app/models/ParentWardLink";
import DailyMark from "@/app/models/DailyMark";
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
    if (!wardIds.length) return NextResponse.json({ dailyMarks: [] });

    const termId = searchParams.get("termId");
    const studentId = searchParams.get("studentId");
    const termFilter = termId
      ? await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termId) }).lean()
      : await Term.findOne({ schoolId, isActive: true }).lean();

    const filter: Record<string, unknown> = { schoolId, studentId: { $in: studentId ? [new mongoose.Types.ObjectId(studentId)] : wardIds } };
    if (termFilter) filter.termId = termFilter._id;

    const marks = await DailyMark.find(filter).sort({ assessmentDate: -1 }).lean();
    const subjectIds = [...new Set(marks.map((m) => m.subjectId.toString()))];
    const subjects = subjectIds.length ? await Subject.find({ _id: { $in: subjectIds } }).lean() : [];
    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), s.name]));

    return NextResponse.json({
      dailyMarks: marks.map((m) => ({
        _id: m._id.toString(),
        studentId: m.studentId.toString(),
        subjectId: m.subjectId.toString(),
        subjectName: subjectMap.get(m.subjectId.toString()) || "Unknown",
        assessmentType: m.assessmentType,
        score: m.score,
        assessmentDate: m.assessmentDate,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch parent daily marks" }, { status: 500 });
  }
}
