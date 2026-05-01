import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const classId = new URL(req.url).searchParams.get("classId");
    if (!classId) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const rows = await Student.find({
      schoolId,
      currentClassId: new mongoose.Types.ObjectId(classId),
    }).lean();

    return NextResponse.json({
      students: rows.map((row) => ({
        _id: (row._id as mongoose.Types.ObjectId).toString(),
        id: (row._id as mongoose.Types.ObjectId).toString(),
        fullName: row.fullName,
        admissionNumber: row.admissionNumber,
        gender: row.gender,
      })),
    });
  } catch (error: unknown) {
    console.error("Fetch students by class error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch students" },
      { status: 500 }
    );
  }
}
