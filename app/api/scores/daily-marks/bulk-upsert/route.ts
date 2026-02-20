import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import TeacherProfile from "@/app/models/TeacherProfile";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user || user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const classId = typeof body.classId === "string" ? body.classId : "";
    const subjectId = typeof body.subjectId === "string" ? body.subjectId : "";
    const academicYearId = typeof body.academicYearId === "string" ? body.academicYearId : "";
    const requestedTermId = typeof body.termId === "string" ? body.termId : undefined;

    const rawType = typeof body.type === "string"
      ? body.type
      : typeof body.assessmentType === "string"
        ? body.assessmentType
        : "";

    const typeMap: Record<string, string> = {
      classwork: "CLASSWORK",
      CLASSWORK: "CLASSWORK",
      homework: "HOMEWORK",
      HOMEWORK: "HOMEWORK",
      test: "EVALUATION",
      TEST: "EVALUATION",
      extracurricular: "EVALUATION",
      EXTRACURRICULAR: "EVALUATION",
      EVALUATION: "EVALUATION",
      exam: "EXAM",
      EXAM: "EXAM"
    };

    const assessmentType = typeMap[rawType] || "";
    const maxScore = body.maxScore !== undefined ? Number(body.maxScore) : 10;
    const entries = Array.isArray(body.entries) ? body.entries : [];

    if (!classId || !subjectId || !academicYearId || !assessmentType || entries.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (Number.isNaN(maxScore) || maxScore <= 0) {
      return NextResponse.json({ error: "Max score must be greater than 0" }, { status: 400 });
    }

    const activeTerm = requestedTermId
      ? await Term.findOne({ _id: requestedTermId, schoolId: user.schoolId })
      : await Term.findOne({ schoolId: user.schoolId, isActive: true });

    if (!activeTerm) {
      return NextResponse.json({ error: "No active term found" }, { status: 400 });
    }

    if (activeTerm.isClosed) {
      return NextResponse.json({ error: "This term is closed. Cannot record marks." }, { status: 400 });
    }

    const teacherProfile = await TeacherProfile.findOne({
      schoolId: user.schoolId,
      userId: user.userId
    }).select("subjectsAndClasses");

    if (!teacherProfile) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    const teachesSubjectInClass = (teacherProfile.subjectsAndClasses || []).some(
      (assignment: any) =>
        assignment?.subjectId?.toString() === subjectId &&
        (assignment?.classIds || []).some((classObjectId: any) => classObjectId?.toString() === classId)
    );

    if (!teachesSubjectInClass) {
      return NextResponse.json(
        { error: "You can only upload marks for subjects/classes assigned to you" },
        { status: 403 }
      );
    }

    const normalizedEntries = entries
      .map((entry: any) => ({
        studentId: typeof entry?.studentId === "string" ? entry.studentId : "",
        score: entry?.score === "" || entry?.score === null || entry?.score === undefined ? null : Number(entry.score),
        notes: typeof entry?.notes === "string" ? entry.notes : ""
      }))
      .filter((entry: any) => entry.studentId && entry.score !== null && !Number.isNaN(entry.score));

    if (normalizedEntries.length === 0) {
      return NextResponse.json({ error: "No valid score entries provided" }, { status: 400 });
    }

    const invalidScore = normalizedEntries.find((entry: any) => entry.score < 0 || entry.score > 100);
    if (invalidScore) {
      return NextResponse.json({ error: "All scores must be between 0 and 100" }, { status: 400 });
    }

    const studentIds = normalizedEntries.map((entry: any) => entry.studentId);
    const validStudents = await Student.find({
      _id: { $in: studentIds },
      schoolId: user.schoolId,
      currentClassId: classId
    }).select("_id");

    const validStudentIdSet = new Set(validStudents.map((student: any) => student._id.toString()));
    const invalidStudent = normalizedEntries.find((entry: any) => !validStudentIdSet.has(entry.studentId));

    if (invalidStudent) {
      return NextResponse.json({ error: "One or more students are not in the selected class" }, { status: 400 });
    }

    let created = 0;
    let updated = 0;

    for (const entry of normalizedEntries) {
      const existing = await DailyMark.findOne({
        schoolId: user.schoolId,
        studentId: entry.studentId,
        subjectId,
        classId,
        teacherId: user.userId,
        academicYearId,
        termId: activeTerm._id,
        assessmentType
      }).select("_id");

      if (existing) {
        await DailyMark.findByIdAndUpdate(existing._id, {
          $set: {
            score: entry.score,
            maxScore,
            feedbackNotes: entry.notes,
            lastModifiedBy: user.userId,
            recordedDate: new Date()
          }
        });
        updated += 1;
      } else {
        await DailyMark.create({
          schoolId: user.schoolId,
          studentId: entry.studentId,
          subjectId,
          classId,
          teacherId: user.userId,
          assessmentType,
          score: entry.score,
          maxScore,
          feedbackNotes: entry.notes,
          recordedDate: new Date(),
          recordedBy: user.userId,
          academicYearId,
          termId: activeTerm._id,
          modificationHistory: []
        });
        created += 1;
      }
    }

    return NextResponse.json({
      message: "Marks saved successfully",
      summary: {
        created,
        updated,
        totalProcessed: normalizedEntries.length
      }
    });
  } catch (error: any) {
    console.error("Bulk upsert daily marks error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save marks" },
      { status: 500 }
    );
  }
}
