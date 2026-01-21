import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import Class from "@/app/models/Class";
import StudentClassHistory from "@/app/models/StudentClassHistory";
import { calculateTermAverage, calculateFinalAverage } from "@/app/utils/academic";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

const NEXT_CLASS: Record<string, string> = {
  JSS1: "JSS2",
  JSS2: "JSS3",
  JSS3: "SSS1",
  SSS1: "SSS2",
  SSS2: "SSS3"
};

export async function POST(req: Request) {
  await connectDB();
  const token = req.headers.get("authorization")?.split(" ")[1];
  const admin: any = verifyToken(token || "");

  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { classId, session, academicYearId } = await req.json();

  if (!academicYearId) {
    return NextResponse.json(
      { error: "Academic year ID is required" },
      { status: 400 }
    );
  }

  const cls = await Class.findById(classId);
  const students = await Student.find({ currentClassId: classId });

  for (const student of students) {
    const termAverages = [];
    for (let term = 1; term <= 3; term++) {
      termAverages.push(
        await calculateTermAverage(student._id.toString(), classId, term)
      );
    }

    const finalAverage = await calculateFinalAverage(termAverages);
    const promoted = finalAverage >= 50;

    await StudentClassHistory.create({
      schoolId: admin.schoolId,
      academicYearId,
      studentId: student._id,
      classId,
      session,
      termAverages,
      finalAverage,
      promoted,
      repeated: !promoted
    });

    if (promoted) {
      if (cls.level === "SSS3") {
        // Student has graduated - you might want to set a graduated flag
        // For now, we'll leave them in SSS3
        // Future: Add a 'graduated' field to Student model
      } else if (NEXT_CLASS[cls.level]) {
        const nextClass = await Class.findOne({
          schoolId: admin.schoolId,
          level: NEXT_CLASS[cls.level],
          arm: cls.arm
        });
        if (nextClass) {
          student.currentClassId = nextClass._id;
          await student.save();
        }
      }
    }
  }

  return NextResponse.json({ status: "Promotion process completed" });
}
