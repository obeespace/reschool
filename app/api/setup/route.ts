import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import { verifyToken } from "@/app/utils/auth";
import SchoolSetup from "@/app/models/SchoolSetup";
import School from "@/app/models/School";
import AcademicYear from "@/app/models/AcademicYear";
import Term from "@/app/models/Term";
import Subject from "@/app/models/Subject";
import Class from "@/app/models/Class";

// GET: Check setup status
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Only ADMIN can access setup endpoints
    if (payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    // Find setup record for this school
    const setup = await SchoolSetup.findOne({
      schoolId: payload.schoolId,
    });

    if (!setup) {
      return NextResponse.json({
        isSetupComplete: false,
        setupData: null,
      });
    }

    return NextResponse.json({
      isSetupComplete: setup.isSetupComplete,
      setupData: setup,
    });
  } catch (error) {
    console.error("Setup status error:", error);
    return NextResponse.json(
      { error: "Failed to check setup status" },
      { status: 500 }
    );
  }
}

// POST: Save setup wizard data
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Only ADMIN can access setup endpoints
    if (payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();

    const {
      schoolName,
      address,
      sessionYear,
      sessionStartDate,
      sessionEndDate,
      terms,
      classLevels,
      classArms,
      subjects,
      admissionNumberFormat,
    } = body;

    // Validate required fields
    if (
      !schoolName ||
      !sessionYear ||
      !sessionStartDate ||
      !sessionEndDate ||
      !terms?.length ||
      !classLevels?.length ||
      !classArms?.length ||
      !subjects?.length ||
      !admissionNumberFormat
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate terms structure
    if (terms.length !== 3 || !terms.every((t: any) => t.termNumber && t.startDate && t.endDate)) {
      return NextResponse.json(
        { error: "All 3 terms must have start and end dates" },
        { status: 400 }
      );
    }

    // Check if setup already exists
    let setup = await SchoolSetup.findOne({
      schoolId: payload.schoolId,
    });

    if (setup && setup.isSetupComplete) {
      return NextResponse.json(
        { error: "Setup already completed for this school" },
        { status: 400 }
      );
    }

    // Create/Update School record
    await School.updateOne(
      { _id: payload.schoolId },
      {
        name: schoolName,
        address: address || undefined,
      },
      { upsert: true }
    );

    // Create AcademicYear
    const academicYear = await AcademicYear.create({
      schoolId: payload.schoolId,
      name: `${sessionYear} Academic Year`,
      startDate: new Date(sessionStartDate),
      endDate: new Date(sessionEndDate),
      isActive: true,
      term: 1,
    });

    // Create 3 Term records
    const createdTerms = await Promise.all(
      terms.map((t: any) =>
        Term.create({
          schoolId: payload.schoolId,
          academicYearId: academicYear._id,
          termNumber: t.termNumber,
          startDate: new Date(t.startDate),
          endDate: new Date(t.endDate),
          isActive: t.termNumber === 1, // Mark first term as active
          isPaid: false,
          isClosed: false,
        })
      )
    );

    // Create or update SchoolSetup record
    if (!setup) {
      setup = new SchoolSetup({
        schoolId: payload.schoolId,
        schoolName,
        address,
        classLevels,
        classArms,
        subjects,
        admissionNumberFormat,
        isSetupComplete: true,
        setupCompletedAt: new Date(),
        setupCompletedBy: payload.userId,
      });
    } else {
      setup.schoolName = schoolName;
      setup.address = address;
      setup.classLevels = classLevels;
      setup.classArms = classArms;
      setup.subjects = subjects;
      setup.admissionNumberFormat = admissionNumberFormat;
      setup.isSetupComplete = true;
      setup.setupCompletedAt = new Date();
      setup.setupCompletedBy = payload.userId;
    }

    await setup.save();

    // Create Subject records from setup subjects
    const createdSubjects = await Promise.all(
      subjects.map((subjectName: string) =>
        Subject.findOneAndUpdate(
          { schoolId: payload.schoolId, name: subjectName.trim() },
          { schoolId: payload.schoolId, name: subjectName.trim() },
          { upsert: true, new: true }
        )
      )
    );

    // Create Class records for each level × arm combination
    const classRecords: Array<{ level: string; arm: string }> = [];
    for (const level of classLevels) {
      for (const arm of classArms) {
        classRecords.push({ level, arm });
      }
    }
    const createdClasses = await Promise.all(
      classRecords.map(({ level, arm }) =>
        Class.findOneAndUpdate(
          { schoolId: payload.schoolId, level, arm },
          { schoolId: payload.schoolId, level, arm },
          { upsert: true, new: true }
        )
      )
    );

    return NextResponse.json(
      {
        message: "Setup completed successfully",
        setupData: setup,
        academicYear,
        terms: createdTerms,
        subjects: createdSubjects,
        classes: createdClasses,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Setup save error:", error);
    return NextResponse.json({ error: "Failed to save setup" }, { status: 500 });
  }
}
