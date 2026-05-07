import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import TeacherProfile from "@/app/models/TeacherProfile";
import Class from "@/app/models/Class";
import Subject from "@/app/models/Subject";
import mongoose from "mongoose";

type TeacherSubjectClassEntry = {
  subjectId: mongoose.Types.ObjectId;
  classIds: mongoose.Types.ObjectId[];
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const teacher = await User.findOne({ schoolId, _id: new mongoose.Types.ObjectId(id), role: "TEACHER" }).lean();
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const profile = await TeacherProfile.findOne({ schoolId, userId: new mongoose.Types.ObjectId(id) }).lean();

    // Collect ids to resolve
    const allClassIds: mongoose.Types.ObjectId[] = [];
    const allSubjectIds: mongoose.Types.ObjectId[] = [];
    if (profile?.classTeacherOf) allClassIds.push(profile.classTeacherOf);
    for (const sc of profile?.subjectsAndClasses || []) {
      allSubjectIds.push(sc.subjectId);
      for (const cid of sc.classIds || []) allClassIds.push(cid);
    }
    const [classes, subjects] = await Promise.all([
      allClassIds.length ? Class.find({ _id: { $in: allClassIds } }).select("_id level arm").lean() : Promise.resolve([]),
      allSubjectIds.length ? Subject.find({ _id: { $in: allSubjectIds } }).select("_id name code").lean() : Promise.resolve([]),
    ]);
    const classMap = new Map((classes as { _id: mongoose.Types.ObjectId; level: string; arm: string }[]).map((c) => [c._id.toString(), c]));
    const subjectMap = new Map((subjects as { _id: mongoose.Types.ObjectId; name: string; code?: string }[]).map((s) => [s._id.toString(), s]));

    const ctId = profile?.classTeacherOf?.toString();
    const ctClass = ctId ? classMap.get(ctId) : null;

    return NextResponse.json({
      teacher: {
        _id: (teacher as { _id: mongoose.Types.ObjectId })._id.toString(),
        id: (teacher as { _id: mongoose.Types.ObjectId })._id.toString(),
        fullName: (teacher as { fullName: string }).fullName,
        email: (teacher as { email: string }).email,
        classTeacherOf: ctClass
          ? { _id: ctId, level: ctClass.level, arm: ctClass.arm, name: `${ctClass.level} ${ctClass.arm}`.trim() }
          : null,
        subjectsAndClasses: (profile?.subjectsAndClasses || []).map((e: TeacherSubjectClassEntry) => {
          const subj = subjectMap.get(e.subjectId.toString());
          return {
            subjectId: { _id: e.subjectId.toString(), name: subj?.name || "", code: subj?.code || "" },
            classIds: (e.classIds || []).map((cid: mongoose.Types.ObjectId) => {
              const cls = classMap.get(cid.toString());
              return { _id: cid.toString(), name: cls ? `${cls.level} ${cls.arm}`.trim() : "" };
            }),
          };
        }),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch teacher" }, { status: 500 });
  }
}
