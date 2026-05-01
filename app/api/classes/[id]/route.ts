import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Class from "@/app/models/Class";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
import mongoose from "mongoose";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const classId = new mongoose.Types.ObjectId(id);

    const cls = await Class.findOne({ schoolId, _id: classId }).lean();
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const [students, subjectIds] = await Promise.all([
      Student.find({ schoolId, currentClassId: classId }).lean(),
      Class.findOne({ _id: classId }).select("subjectIds").lean(),
    ]);

    const linkedSubjectIds = ((subjectIds as {subjectIds?: mongoose.Types.ObjectId[]})?.subjectIds || []);
    const subjects = linkedSubjectIds.length
      ? await Subject.find({ _id: { $in: linkedSubjectIds } }).lean()
      : [];

    return NextResponse.json({
      class: {
        _id: (cls as {_id: mongoose.Types.ObjectId})._id.toString(),
        level: (cls as {level: string}).level,
        arm: (cls as {arm: string}).arm,
        name: `${(cls as {level: string}).level} ${(cls as {arm: string}).arm}`.trim(),
        studentCount: students.length,
      },
      students: students.map((s) => ({
        _id: (s as {_id: mongoose.Types.ObjectId})._id.toString(),
        fullName: (s as {fullName: string}).fullName,
        admissionNumber: (s as {admissionNumber: string}).admissionNumber,
        gender: (s as {gender?: string}).gender,
      })),
      subjects: subjects.map((s) => ({ _id: (s as {_id: mongoose.Types.ObjectId})._id.toString(), name: (s as {name: string}).name })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch class" }, { status: 500 });
  }
}
