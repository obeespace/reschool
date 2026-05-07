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

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const teacherUsers = await User.find({ schoolId, role: "TEACHER" }).select("_id fullName email").lean();
    const profiles = await TeacherProfile.find({ schoolId }).lean();
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    // Collect all classIds and subjectIds we need to resolve
    const allClassIds: mongoose.Types.ObjectId[] = [];
    const allSubjectIds: mongoose.Types.ObjectId[] = [];
    for (const p of profiles) {
      if (p.classTeacherOf) allClassIds.push(p.classTeacherOf);
      for (const sc of p.subjectsAndClasses || []) {
        allSubjectIds.push(sc.subjectId);
        for (const cid of sc.classIds || []) allClassIds.push(cid);
      }
    }
    const [classes, subjects] = await Promise.all([
      allClassIds.length ? Class.find({ _id: { $in: allClassIds } }).select("_id level arm").lean() : Promise.resolve([]),
      allSubjectIds.length ? Subject.find({ _id: { $in: allSubjectIds } }).select("_id name code").lean() : Promise.resolve([]),
    ]);
    const classMap = new Map((classes as { _id: mongoose.Types.ObjectId; level: string; arm: string }[]).map((c) => [c._id.toString(), c]));
    const subjectMap = new Map((subjects as { _id: mongoose.Types.ObjectId; name: string; code?: string }[]).map((s) => [s._id.toString(), s]));

    const teachers = teacherUsers.map((t) => {
      const profile = profileMap.get(t._id.toString());
      const ctId = profile?.classTeacherOf?.toString();
      const ctClass = ctId ? classMap.get(ctId) : null;
      return {
        _id: t._id.toString(),
        id: t._id.toString(),
        fullName: t.fullName,
        email: t.email,
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
      };
    });

    return NextResponse.json({ teachers });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch teachers" }, { status: 500 });
  }
}
