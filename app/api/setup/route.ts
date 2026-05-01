import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import { verifyToken } from "@/app/utils/auth";
import SchoolSetup from "@/app/models/SchoolSetup";
import School from "@/app/models/School";

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
      classLevels,
      classArms,
      subjects,
      admissionNumberFormat,
    } = body;

    // Validate required fields
    if (
      !schoolName ||
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

    // Check if setup already exists
    let setup = await SchoolSetup.findOne({
      schoolId: payload.schoolId,
    });

    if (!setup) {
      // Create new setup record
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
      // Update existing setup record (only once)
      if (setup.isSetupComplete) {
        return NextResponse.json(
          { error: "Setup already completed for this school" },
          { status: 400 }
        );
      }

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

    // Also update School record with these details
    await School.updateOne(
      { _id: payload.schoolId },
      {
        name: schoolName,
        address: address || undefined,
      }
    );

    return NextResponse.json(
      {
        message: "Setup completed successfully",
        setupData: setup,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Setup save error:", error);
    return NextResponse.json({ error: "Failed to save setup" }, { status: 500 });
  }
}
