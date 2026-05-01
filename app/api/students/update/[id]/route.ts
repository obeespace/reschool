import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import mongoose from "mongoose";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Student id is required" }, { status: 400 });
    }

    const body = await req.json();
    const fullName = String(body?.fullName || "").trim();
    const admissionNumber = String(body?.admissionNumber || "").trim();
    const gender = body?.gender ? String(body.gender).trim() : null;
    const dateOfBirth = body?.dateOfBirth ? new Date(body.dateOfBirth) : null;
    const classId = body?.classId ? String(body.classId).trim() : undefined;

    if (!fullName || !admissionNumber) {
      return NextResponse.json({ error: "Full name and admission number are required" }, { status: 400 });
    }

    // Build update object — only include defined optional fields
    const updateFields: Record<string, unknown> = { fullName, admissionNumber, gender, dateOfBirth };
    if (classId) updateFields.currentClassId = new mongoose.Types.ObjectId(classId);
    if (body?.photoUrl !== undefined) updateFields.photoUrl = String(body.photoUrl).trim() || null;
    if (body?.track !== undefined) updateFields.track = body.track ? String(body.track).toUpperCase() : null;
    if (body?.house !== undefined) updateFields.house = body.house ? String(body.house).trim() : null;
    if (body?.bloodGroup !== undefined) updateFields.bloodGroup = body.bloodGroup || null;
    if (body?.genotype !== undefined) updateFields.genotype = body.genotype ? String(body.genotype).toUpperCase() : null;
    if (body?.allergies !== undefined) updateFields.allergies = Array.isArray(body.allergies) ? body.allergies.map(String).filter(Boolean) : [];
    if (body?.medicalConditions !== undefined) updateFields.medicalConditions = Array.isArray(body.medicalConditions) ? body.medicalConditions.map(String).filter(Boolean) : [];
    if (body?.emergencyContactName !== undefined) updateFields.emergencyContactName = String(body.emergencyContactName).trim() || null;
    if (body?.emergencyContactPhone !== undefined) updateFields.emergencyContactPhone = String(body.emergencyContactPhone).trim() || null;
    if (body?.isPrefect !== undefined) updateFields.isPrefect = Boolean(body.isPrefect);
    if (body?.prefectTitle !== undefined) updateFields.prefectTitle = body.prefectTitle ? String(body.prefectTitle).trim() : null;

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    await Student.findOneAndUpdate({ _id: id, schoolId }, { $set: updateFields });

    return NextResponse.json({
      message: "Student updated successfully",
      student: { id, fullName, admissionNumber, gender, dateOfBirth },
    });
  } catch (error: unknown) {
    console.error("Update student error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update student" },
      { status: 500 }
    );
  }
}
