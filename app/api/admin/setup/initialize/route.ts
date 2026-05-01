import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Subject from "@/app/models/Subject";
import Class from "@/app/models/Class";
import AcademicYear from "@/app/models/AcademicYear";
import Term from "@/app/models/Term";
import AdmissionSettings from "@/app/models/AdmissionSettings";
import School from "@/app/models/School";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const body = await req.json().catch(() => ({}));

    const tasks: Promise<unknown>[] = [];

    // ── 1. Update school name/branding if provided ────────────────────────
    if (body?.school?.name) {
      const schoolUpdate: Record<string, string> = { name: String(body.school.name).trim() };
      tasks.push(School.findByIdAndUpdate(schoolId, { $set: schoolUpdate }));
    }

    // ── 2. Upsert Academic Year (session) ─────────────────────────────────
    let yearId: mongoose.Types.ObjectId | null = null;
    if (body?.session?.year) {
      const yearName = String(body.session.year).trim();
      const startDate = body.session.startDate ? new Date(body.session.startDate) : undefined;
      const endDate = body.session.endDate ? new Date(body.session.endDate) : undefined;

      // Deactivate any existing active year first
      await AcademicYear.updateMany({ schoolId, isActive: true }, { $set: { isActive: false } });

      const year = await AcademicYear.findOneAndUpdate(
        { schoolId, name: yearName },
        { $set: { schoolId, name: yearName, isActive: true, ...(startDate && { startDate }), ...(endDate && { endDate }) } },
        { upsert: true, new: true }
      );
      yearId = year._id as mongoose.Types.ObjectId;

      // ── 3. Ensure Term 1 exists for this academic year ───────────────────
      const termStart = body.session.startDate ? new Date(body.session.startDate) : new Date();
      const termEnd = body.session.endDate ? new Date(new Date(body.session.endDate).getTime() - 1000 * 60 * 60 * 24 * 150) : new Date();

      await Term.updateMany({ schoolId, isActive: true }, { $set: { isActive: false } });
      tasks.push(
        Term.findOneAndUpdate(
          { schoolId, academicYearId: yearId, termNumber: 1 },
          { $setOnInsert: { schoolId, academicYearId: yearId, termNumber: 1, startDate: termStart, endDate: termEnd, isActive: true, isPaid: true, isClosed: false } },
          { upsert: true }
        )
      );
    }

    // ── 4. Subjects ───────────────────────────────────────────────────────
    const subjectNames: string[] = Array.isArray(body?.subjects) && body.subjects.length > 0 ? body.subjects : [];
    for (const name of subjectNames) {
      if (name?.trim()) {
        tasks.push(Subject.findOneAndUpdate({ schoolId, name: name.trim() }, { $setOnInsert: { schoolId, name: name.trim() } }, { upsert: true }));
      }
    }

    // ── 5. Classes: cross-join levels × arms ─────────────────────────────
    const classLevels: string[] = Array.isArray(body?.classes) ? body.classes.filter(Boolean) : [];
    const arms: string[] = Array.isArray(body?.arms) ? body.arms.filter(Boolean) : ["A"];

    for (const level of classLevels) {
      for (const arm of arms) {
        tasks.push(
          Class.findOneAndUpdate(
            { schoolId, level: level.trim(), arm: arm.trim() },
            { $setOnInsert: { schoolId, level: level.trim(), arm: arm.trim() } },
            { upsert: true }
          )
        );
      }
    }

    // ── 6. Admission settings ─────────────────────────────────────────────
    const admSettings = body?.admissionSettings;
    if (admSettings) {
      tasks.push(
        AdmissionSettings.findOneAndUpdate(
          { schoolId },
          {
            $set: {
              schoolId,
              prefix: String(admSettings.prefix || "ADM").trim().toUpperCase(),
              yearFormat: admSettings.yearFormat === "YY" ? "YY" : "YYYY",
              numberLength: Math.min(6, Math.max(2, Number(admSettings.numberLength) || 4)),
            },
          },
          { upsert: true }
        )
      );
    } else {
      // Ensure defaults exist
      tasks.push(AdmissionSettings.findOneAndUpdate({ schoolId }, { $setOnInsert: { schoolId, prefix: "ADM", yearFormat: "YYYY", numberLength: 4 } }, { upsert: true }));
    }

    await Promise.all(tasks);

    return NextResponse.json({ message: "School setup initialized successfully" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to initialize setup" }, { status: 500 });
  }
}

