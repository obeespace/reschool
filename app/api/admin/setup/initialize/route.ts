import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Subject from "@/app/models/Subject";
import Class from "@/app/models/Class";
import AcademicYear from "@/app/models/AcademicYear";
import AdmissionSettings from "@/app/models/AdmissionSettings";
import mongoose from "mongoose";

const DEFAULT_SUBJECTS = ["English Language", "Mathematics", "Basic Science", "Social Studies", "Civic Education", "Agricultural Science", "Basic Technology", "Home Economics", "Physical Education", "Religious Studies", "French", "Computer Studies"];
const DEFAULT_CLASSES = [
  { level: "JSS1", arm: "A" }, { level: "JSS1", arm: "B" }, { level: "JSS2", arm: "A" }, { level: "JSS2", arm: "B" },
  { level: "JSS3", arm: "A" }, { level: "JSS3", arm: "B" }, { level: "SSS1", arm: "A" }, { level: "SSS1", arm: "B" },
  { level: "SSS2", arm: "A" }, { level: "SSS2", arm: "B" }, { level: "SSS3", arm: "A" }, { level: "SSS3", arm: "B" },
];

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const body = await req.json().catch(() => ({}));

    const tasks = [];

    // Subjects
    const subjectNames: string[] = Array.isArray(body?.subjects) && body.subjects.length > 0 ? body.subjects : DEFAULT_SUBJECTS;
    for (const name of subjectNames) {
      tasks.push(Subject.findOneAndUpdate({ schoolId, name }, { $setOnInsert: { schoolId, name } }, { upsert: true }));
    }

    // Classes
    const classesToCreate: Array<{level: string, arm: string}> = Array.isArray(body?.classes) && body.classes.length > 0 ? body.classes : DEFAULT_CLASSES;
    for (const cls of classesToCreate) {
      tasks.push(Class.findOneAndUpdate({ schoolId, level: cls.level, arm: cls.arm }, { $setOnInsert: { schoolId, level: cls.level, arm: cls.arm } }, { upsert: true }));
    }

    // Academic Year
    if (body?.academicYear) {
      const yearName = String(body.academicYear.name || "").trim();
      if (yearName) {
        tasks.push(AcademicYear.findOneAndUpdate({ schoolId, name: yearName }, { $setOnInsert: { schoolId, name: yearName, isActive: true } }, { upsert: true }));
      }
    }

    // Admission settings
    tasks.push(AdmissionSettings.findOneAndUpdate({ schoolId }, { $setOnInsert: { schoolId, prefix: "ADM", yearFormat: "YYYY", numberLength: 4 } }, { upsert: true }));

    await Promise.all(tasks);

    return NextResponse.json({ message: "School setup initialized successfully" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to initialize setup" }, { status: 500 });
  }
}
