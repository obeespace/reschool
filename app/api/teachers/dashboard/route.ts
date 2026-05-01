import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import Class from "@/app/models/Class";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
import AcademicYear from "@/app/models/AcademicYear";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);
    const userId = new mongoose.Types.ObjectId(teacher.userId);

    const profile = await TeacherProfile.findOne({ schoolId, userId }).lean();
    if (!profile) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });

    const allClassIds = new Set<string>();
    if (profile.classTeacherOf) allClassIds.add(profile.classTeacherOf.toString());
    for (const entry of profile.subjectsAndClasses || []) {
      for (const cid of entry.classIds || []) allClassIds.add(cid.toString());
    }

    const classIds = [...allClassIds].map((id) => new mongoose.Types.ObjectId(id));
    const classes = classIds.length ? await Class.find({ _id: { $in: classIds } }).lean() : [];
    const classMap = new Map(classes.map((c) => [c._id.toString(), c]));

    const myStudents = profile.classTeacherOf
      ? await Student.countDocuments({ schoolId, currentClassId: profile.classTeacherOf })
      : 0;

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    const activeYear = activeTerm ? await AcademicYear.findById(activeTerm.academicYearId).lean() : null;

    return NextResponse.json({
      profile: {
        classTeacherOf: profile.classTeacherOf ? { _id: profile.classTeacherOf.toString(), ...(classMap.get(profile.classTeacherOf.toString()) || {}) } : null,
        subjectsAndClasses: (profile.subjectsAndClasses || []).map((e: {subjectId: mongoose.Types.ObjectId; classIds: mongoose.Types.ObjectId[]}) => ({
          subjectId: { _id: e.subjectId.toString() },
          classIds: e.classIds.map((id: mongoose.Types.ObjectId) => ({ _id: id.toString(), ...(classMap.get(id.toString()) || {}) })),
        })),
      },
      stats: {
        myStudents,
        activeTerm: activeTerm && activeYear ? `${(activeYear as {name?: string}).name} T${activeTerm.termNumber}` : "N/A",
        myClasses: allClassIds.size,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch teacher dashboard" }, { status: 500 });
  }
}
