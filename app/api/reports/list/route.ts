import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ReportCard from "@/app/models/ReportCard";
import TeacherProfile from "@/app/models/TeacherProfile";
import ParentWardLink from "@/app/models/ParentWardLink";
import Term from "@/app/models/Term";
import AcademicYear from "@/app/models/AcademicYear";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const termId = searchParams.get("termId");
    const academicYearId = searchParams.get("academicYearId");
    const filter: Record<string, unknown> = { schoolId };

    if (termId) {
      filter.termId = new mongoose.Types.ObjectId(termId);
    } else if (academicYearId) {
      filter.academicYearId = new mongoose.Types.ObjectId(academicYearId);
    } else {
      const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
      if (activeTerm) filter.termId = activeTerm._id;
    }

    if (user.role === "TEACHER") {
      const profile = await TeacherProfile.findOne({ schoolId, userId: new mongoose.Types.ObjectId(user.userId) }).lean();
      const allClassIds = new Set<string>();
      if (profile?.classTeacherOf) allClassIds.add(profile.classTeacherOf.toString());
      for (const e of profile?.subjectsAndClasses || []) {
        for (const cid of e.classIds || []) allClassIds.add(cid.toString());
      }
      if (allClassIds.size > 0) {
        filter.classId = { $in: [...allClassIds].map((id) => new mongoose.Types.ObjectId(id)) };
      }
    } else if (user.role === "PARENT") {
      const wardLinks = await ParentWardLink.find({ schoolId, parentId: new mongoose.Types.ObjectId(user.userId) }).lean();
      const wardIds = wardLinks.map((w) => w.studentId);
      filter.studentId = { $in: wardIds };
      filter.approvedBy = { $ne: null }; // Only released reports
    }

    const reports = await ReportCard.find(filter).sort({ createdAt: -1 }).lean();
    const yearIds = [...new Set(reports.map((r) => r.academicYearId.toString()))];
    const years = yearIds.length
      ? await AcademicYear.find({ _id: { $in: yearIds } }).select("_id name").lean()
      : [];
    const yearMap = new Map(years.map((y) => [y._id.toString(), y.name]));

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r._id.toString(),
        _id: r._id.toString(),
        studentId: r.studentId.toString(),
        classId: r.classId.toString(),
        className: r.className,
        termId: r.termId.toString(),
        academicYearId: r.academicYearId.toString(),
        termNumber: r.term,
        yearLabel: yearMap.get(r.academicYearId.toString()) || `${r.year}`,
        subjectScores: r.subjectScores || [],
        totalScore: r.totalScore ?? null,
        averageScore: r.averageScore ?? null,
        classRanking: r.classRanking ?? null,
        classSize: r.classSize ?? null,
        attendancePercentage: r.attendancePercentage ?? null,
        lowAttendanceAlert: (r.attendancePercentage ?? 100) < 75,
        isReleased: Boolean(r.approvedBy),
        approvedBy: r.approvedBy ? r.approvedBy.toString() : null,
        printCount: r.printCount ?? 0,
        createdAt: r.createdAt,
      })),
      appliedFilters: {
        termId: termId || null,
        academicYearId: academicYearId || null,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch reports" }, { status: 500 });
  }
}
