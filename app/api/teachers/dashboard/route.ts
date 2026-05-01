import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import Student from "@/app/models/Students";
import Score from "@/app/models/Score";
import "@/app/models/Class";
import "@/app/models/Subject";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");

    if (!user || user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const profile = await TeacherProfile.findOne({ userId: user.userId })
      .populate("classTeacherOf", "level arm")
      .populate("subjectsAndClasses.subjectId", "name code")
      .populate("subjectsAndClasses.classIds", "level arm");

    if (!profile) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    const classIds = new Set<string>();

    if (profile.classTeacherOf) {
      classIds.add(profile.classTeacherOf._id.toString());
    }

    profile.subjectsAndClasses.forEach((entry: any) => {
      entry.classIds.forEach((cls: any) => classIds.add(cls._id.toString()));
    });

    const classIdList = Array.from(classIds);

    const [myStudents, scoresUploaded] = await Promise.all([
      Student.countDocuments({ schoolId: user.schoolId, currentClassId: { $in: classIdList } }),
      Score.countDocuments({ schoolId: user.schoolId, teacherId: user.userId })
    ]);

    const classStudentCounts = await Promise.all(
      classIdList.map(async (classId) => ({
        classId,
        count: await Student.countDocuments({ schoolId: user.schoolId, currentClassId: classId })
      }))
    );

    const classCountMap = new Map(classStudentCounts.map((c) => [c.classId, c.count]));

    const classTeacherOf = profile.classTeacherOf
      ? {
          _id: (profile.classTeacherOf as any)._id,
          level: (profile.classTeacherOf as any).level,
          arm: (profile.classTeacherOf as any).arm,
          name: `${(profile.classTeacherOf as any).level} ${(profile.classTeacherOf as any).arm}`,
          studentCount: classCountMap.get((profile.classTeacherOf as any)._id.toString()) || 0
        }
      : null;

    const subjectsAndClasses = profile.subjectsAndClasses.map((entry: any) => ({
      subject: {
        _id: entry.subjectId?._id,
        name: entry.subjectId?.name,
        code: entry.subjectId?.code
      },
      classes: entry.classIds.map((cls: any) => ({
        _id: cls._id,
        level: cls.level,
        arm: cls.arm,
        name: `${cls.level} ${cls.arm}`,
        studentCount: classCountMap.get(cls._id.toString()) || 0
      }))
    }));

    const myClasses = Array.from(
      new Map(
        [...(classTeacherOf ? [classTeacherOf] : []), ...subjectsAndClasses.flatMap((s: any) => s.classes)].map(
          (cls) => [cls._id.toString(), cls]
        )
      ).values()
    );

    return NextResponse.json({
      stats: {
        myClasses: classIdList.length,
        myStudents,
        scoresUploaded
      },
      assignments: {
        classTeacherOf,
        subjectsAndClasses
      },
      classes: myClasses
    });
  } catch (error: any) {
    console.error("Teacher dashboard error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch teacher dashboard" },
      { status: 500 }
    );
  }
}
