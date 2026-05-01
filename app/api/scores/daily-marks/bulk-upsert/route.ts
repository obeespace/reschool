import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import Term from "@/app/models/Term";
import TeacherProfile from "@/app/models/TeacherProfile";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const entries: Array<{studentId: string; classId: string; subjectId: string; score: number; assessmentType?: string; assessmentDate?: string; notes?: string}> = Array.isArray(body?.entries) ? body.entries : [];
    if (!entries.length) return NextResponse.json({ error: "entries array is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);

    const profile = await TeacherProfile.findOne({
      schoolId,
      userId: new mongoose.Types.ObjectId(teacher.userId),
    }).lean();
    if (!profile) return NextResponse.json({ error: "Teacher profile not found" }, { status: 403 });

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    if (!activeTerm) return NextResponse.json({ error: "No active term" }, { status: 400 });
    if (!activeTerm.isPaid) return NextResponse.json({ error: "Term not paid" }, { status: 400 });
    if (activeTerm.isClosed) return NextResponse.json({ error: "Term is closed" }, { status: 400 });

    const validTypes = ["CLASSWORK", "HOMEWORK", "EVALUATION", "EXAM"];
    const ops = entries.map((entry) => {
      const allowed = (profile.subjectsAndClasses || []).some(
        (s: {subjectId: mongoose.Types.ObjectId; classIds: mongoose.Types.ObjectId[]}) =>
          s.subjectId.toString() === String(entry.subjectId) &&
          (s.classIds || []).some((cid) => cid.toString() === String(entry.classId))
      );
      if (!allowed) {
        throw new Error("You are not assigned to one or more class-subject entries");
      }

      const assessmentType = (entry.assessmentType || "CLASSWORK").toUpperCase().trim();
      const safeType = validTypes.includes(assessmentType) ? assessmentType : "CLASSWORK";
      const filter = {
        schoolId,
        studentId: new mongoose.Types.ObjectId(entry.studentId),
        classId: new mongoose.Types.ObjectId(entry.classId),
        subjectId: new mongoose.Types.ObjectId(entry.subjectId),
        termId: activeTerm._id,
        assessmentType: safeType,
        assessmentDate: entry.assessmentDate ? new Date(entry.assessmentDate) : new Date(),
      };
      const update = {
        $set: {
          score: Number(entry.score),
          teacherId: new mongoose.Types.ObjectId(teacher.userId),
          recordedBy: new mongoose.Types.ObjectId(teacher.userId),
          lastModifiedBy: new mongoose.Types.ObjectId(teacher.userId),
          academicYearId: activeTerm.academicYearId,
          feedbackNotes: entry.notes || null,
        },
      };
      return { updateOne: { filter, update, upsert: true } };
    });

    const result = await DailyMark.bulkWrite(ops);
    return NextResponse.json({ message: "Bulk upsert complete", upserted: result.upsertedCount, modified: result.modifiedCount });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bulk upsert failed" }, { status: 500 });
  }
}
