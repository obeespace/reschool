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

    if (!fullName || !admissionNumber) {
      return NextResponse.json({ error: "Full name and admission number are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    await Student.findOneAndUpdate({ _id: id, schoolId }, { fullName, admissionNumber, gender, dateOfBirth });

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
