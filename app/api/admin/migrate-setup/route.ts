import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import { verifyToken } from "@/app/utils/auth";
import SchoolSetup from "@/app/models/SchoolSetup";
import Subject from "@/app/models/Subject";
import Class from "@/app/models/Class";
import mongoose from "mongoose";

/**
 * POST /api/admin/migrate-setup
 * Backfills Subject and Class records from the school's SchoolSetup document.
 * Safe to run multiple times (uses upsert). Only creates what is missing.
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const schoolId = new mongoose.Types.ObjectId(payload.schoolId);

    const setup = await SchoolSetup.findOne({ schoolId }).lean();
    if (!setup || !setup.isSetupComplete) {
      return NextResponse.json(
        { error: "Setup not complete. Please complete the setup wizard first." },
        { status: 400 }
      );
    }

    const { subjects, classLevels, classArms } = setup;

    // Upsert Subject records
    const subjectResults = await Promise.all(
      (subjects as string[]).map((name: string) =>
        Subject.findOneAndUpdate(
          { schoolId, name: name.trim() },
          { $setOnInsert: { schoolId, name: name.trim() } },
          { upsert: true, new: true }
        )
      )
    );

    // Upsert Class records for every level × arm combination
    const classResults = await Promise.all(
      (classLevels as string[]).flatMap((level: string) =>
        (classArms as string[]).map((arm: string) =>
          Class.findOneAndUpdate(
            { schoolId, level: level.trim(), arm: arm.trim() },
            { $setOnInsert: { schoolId, level: level.trim(), arm: arm.trim() } },
            { upsert: true, new: true }
          )
        )
      )
    );

    return NextResponse.json({
      message: "Migration complete",
      subjects: subjectResults.length,
      classes: classResults.length,
    });
  } catch (error) {
    console.error("Migrate setup error:", error);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
