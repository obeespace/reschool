import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
import Term from "@/app/models/Term";
import AcademicYear from "@/app/models/AcademicYear";
import TeacherProfile from "@/app/models/TeacherProfile";
import ParentWardLink from "@/app/models/ParentWardLink";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const termId = searchParams.get("termId");
    const academicYearId = searchParams.get("academicYearId");
    const studentId = searchParams.get("studentId");

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const filter: Record<string, unknown> = { schoolId };
    if (classId) filter.classId = new mongoose.Types.ObjectId(classId);
    if (subjectId) filter.subjectId = new mongoose.Types.ObjectId(subjectId);
    if (studentId) filter.studentId = new mongoose.Types.ObjectId(studentId);

    if (user.role === "TEACHER") {
      const profile = await TeacherProfile.findOne({
        schoolId,
        userId: new mongoose.Types.ObjectId(user.userId),
      }).lean();

      const allowedClassIds = new Set<string>();
      for (const assignment of profile?.subjectsAndClasses || []) {
        for (const cid of assignment.classIds || []) {
          allowedClassIds.add(cid.toString());
        }
      }

      if (allowedClassIds.size === 0) {
        return NextResponse.json({ scores: [] });
      }

      // Restrict to teacher's assigned classes; honour an explicit classId param if within allowed set
      if (classId && allowedClassIds.has(classId)) {
        filter.classId = new mongoose.Types.ObjectId(classId);
      } else {
        filter.classId = {
          $in: [...allowedClassIds].map((id) => new mongoose.Types.ObjectId(id)),
        };
      }
    }

    if (user.role === "PARENT") {
      const links = await ParentWardLink.find({
        schoolId,
        parentId: new mongoose.Types.ObjectId(user.userId),
      }).lean();
      const wardIds = links.map((w) => w.studentId);
      filter.studentId = { $in: wardIds };
    }

    if (termId) {
      const term = await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termId) }).lean();
      if (term) {
        filter.term = term.termNumber;
        filter.academicYearId = term.academicYearId;
      }
    } else if (academicYearId) {
      filter.academicYearId = new mongoose.Types.ObjectId(academicYearId);
    } else {
      const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
      if (activeTerm) {
        filter.term = activeTerm.termNumber;
        filter.academicYearId = activeTerm.academicYearId;
      }
    }

    const scores = await Score.find(filter).lean();

    const studentIds = [...new Set(scores.map((s) => s.studentId.toString()))];
    const subjectIds = [...new Set(scores.map((s) => s.subjectId.toString()))];

    const [students, subjects] = await Promise.all([
      studentIds.length ? Student.find({ _id: { $in: studentIds } }).select("_id fullName admissionNumber").lean() : [],
      subjectIds.length ? Subject.find({ _id: { $in: subjectIds } }).select("_id name").lean() : [],
    ]);

    const academicYearIds = [...new Set(scores.map((s) => s.academicYearId?.toString()).filter(Boolean))] as string[];
    const years = academicYearIds.length
      ? await AcademicYear.find({ _id: { $in: academicYearIds } }).select("_id name").lean()
      : [];

    const studentMap = new Map(students.map((s) => [s._id.toString(), s]));
    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), s]));
    const yearMap = new Map(years.map((y) => [y._id.toString(), y.name]));

    return NextResponse.json({
      scores: scores.map((s) => {
        const student = studentMap.get(s.studentId.toString());
        const subject = subjectMap.get(s.subjectId.toString());
        return {
          _id: s._id.toString(),
          studentId: s.studentId.toString(),
          studentName: student?.fullName || "Unknown",
          admissionNumber: student?.admissionNumber || "",
          subjectId: s.subjectId.toString(),
          subjectName: subject?.name || "Unknown",
          term: s.term,
          academicYearId: s.academicYearId?.toString() || null,
          academicYearName: s.academicYearId ? yearMap.get(s.academicYearId.toString()) || null : null,
          classwork: s.classwork ?? null,
          homework: s.homework ?? null,
          test: s.test ?? null,
          exam: s.exam ?? null,
          total: s.total ?? null,
          grade: (s as Record<string, unknown>).grade ?? null,
          score: s.total ?? null,
        };
      }),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch scores" }, { status: 500 });
  }
}
