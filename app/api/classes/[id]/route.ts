import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Class from "@/app/models/Class";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
import TeacherProfile from "@/app/models/TeacherProfile";
import User from "@/app/models/User";
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

    const cls = await Class.findOne({ schoolId, _id: classId }).lean() as {
      _id: mongoose.Types.ObjectId;
      level: string;
      arm: string;
      classTeacherId?: mongoose.Types.ObjectId | null;
      subjectIds?: mongoose.Types.ObjectId[];
    } | null;
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    // Fetch all related data in parallel
    const [students, subjects, classTeacherUser, teacherProfiles] = await Promise.all([
      Student.find({ schoolId, currentClassId: classId }).lean(),
      cls.subjectIds?.length
        ? Subject.find({ _id: { $in: cls.subjectIds } }).lean()
        : Promise.resolve([]),
      cls.classTeacherId
        ? User.findById(cls.classTeacherId).select("fullName email").lean()
        : Promise.resolve(null),
      TeacherProfile.find({ schoolId, "subjectsAndClasses.classIds": classId }).lean(),
    ]);

    // Fetch parent users for students that have parentIds
    const parentIds = (students as { parentId?: mongoose.Types.ObjectId }[])
      .filter((s) => s.parentId)
      .map((s) => s.parentId!);
    const parentUsers = parentIds.length
      ? await User.find({ _id: { $in: parentIds } }).select("fullName email").lean()
      : [];
    const parentMap = new Map(
      (parentUsers as { _id: mongoose.Types.ObjectId; fullName: string; email: string }[]).map(
        (p) => [p._id.toString(), p]
      )
    );

    // Build subjectTeachers: fetch User docs for each teacher profile
    const teacherUserIds = teacherProfiles.map(
      (tp) => (tp as { userId: mongoose.Types.ObjectId }).userId
    );
    const teacherUsers = teacherUserIds.length
      ? await User.find({ _id: { $in: teacherUserIds } }).select("fullName email").lean()
      : [];
    const teacherUserMap = new Map(
      (teacherUsers as { _id: mongoose.Types.ObjectId; fullName: string; email: string }[]).map(
        (u) => [u._id.toString(), u]
      )
    );
    const subjectMap = new Map(
      (subjects as { _id: mongoose.Types.ObjectId; name: string; code?: string }[]).map(
        (s) => [s._id.toString(), s]
      )
    );

    const subjectTeachers: { subject: { _id: string; name: string; code: string }; teacher: { _id: string; fullName: string; email: string } }[] = [];
    for (const tp of teacherProfiles as { userId: mongoose.Types.ObjectId; subjectsAndClasses: { subjectId: mongoose.Types.ObjectId; classIds: mongoose.Types.ObjectId[] }[] }[]) {
      const tUser = teacherUserMap.get(tp.userId.toString());
      if (!tUser) continue;
      for (const sc of tp.subjectsAndClasses) {
        const classMatch = sc.classIds.some((cid) => cid.toString() === classId.toString());
        if (!classMatch) continue;
        const subj = subjectMap.get(sc.subjectId.toString());
        if (!subj) continue;
        subjectTeachers.push({
          subject: { _id: subj._id.toString(), name: subj.name, code: subj.code || "" },
          teacher: { _id: tp.userId.toString(), fullName: tUser.fullName, email: tUser.email },
        });
      }
    }

    const maleCount = (students as { gender?: string }[]).filter(
      (s) => s.gender?.toLowerCase() === "male"
    ).length;
    const femaleCount = (students as { gender?: string }[]).filter(
      (s) => s.gender?.toLowerCase() === "female"
    ).length;

    return NextResponse.json({
      class: {
        _id: cls._id.toString(),
        level: cls.level,
        arm: cls.arm,
        name: `${cls.level} ${cls.arm}`.trim(),
        classTeacher: classTeacherUser
          ? {
              _id: (classTeacherUser as { _id: mongoose.Types.ObjectId; fullName: string; email: string })._id.toString(),
              fullName: (classTeacherUser as { fullName: string }).fullName,
              email: (classTeacherUser as { email: string }).email,
            }
          : null,
        subjects: (subjects as { _id: mongoose.Types.ObjectId; name: string; code?: string }[]).map((s) => ({
          _id: s._id.toString(),
          name: s.name,
          code: s.code || "",
        })),
        students: (students as { _id: mongoose.Types.ObjectId; fullName: string; admissionNumber: string; gender?: string; dateOfBirth?: Date; parentId?: mongoose.Types.ObjectId }[]).map((s) => ({
          _id: s._id.toString(),
          fullName: s.fullName,
          registrationNumber: s.admissionNumber,
          gender: s.gender || "",
          dateOfBirth: s.dateOfBirth ? s.dateOfBirth.toISOString() : "",
          parent: s.parentId ? (parentMap.get(s.parentId.toString()) ? {
            fullName: parentMap.get(s.parentId.toString())!.fullName,
            email: parentMap.get(s.parentId.toString())!.email,
          } : null) : null,
        })),
        subjectTeachers,
        stats: {
          totalStudents: students.length,
          maleStudents: maleCount,
          femaleStudents: femaleCount,
          totalSubjects: (subjects as unknown[]).length,
          hasClassTeacher: !!classTeacherUser,
        },
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch class" }, { status: 500 });
  }
}
