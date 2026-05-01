import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import ClassModel from "@/app/models/Class";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const rows = await Student.find({ schoolId }).lean();

    const classIds = [...new Set(rows.map((s) => s.currentClassId?.toString()).filter(Boolean))];
    const classes = classIds.length
      ? await ClassModel.find({ _id: { $in: classIds } }).select("level arm").lean()
      : [];
    const classMap = new Map(classes.map((c) => [(c._id as mongoose.Types.ObjectId).toString(), `${c.level} ${c.arm}`]));

    return NextResponse.json({
      students: rows.map((row) => ({
        _id: (row._id as mongoose.Types.ObjectId).toString(),
        id: (row._id as mongoose.Types.ObjectId).toString(),
        fullName: row.fullName,
        admissionNumber: row.admissionNumber,
        dateOfBirth: row.dateOfBirth,
        gender: row.gender,
        currentClassId: row.currentClassId ? (row.currentClassId as mongoose.Types.ObjectId).toString() : null,
        currentClass: row.currentClassId ? classMap.get((row.currentClassId as mongoose.Types.ObjectId).toString()) || null : null,
        photoUrl: (row as Record<string, unknown>).photoUrl as string || null,
        track: (row as Record<string, unknown>).track as string || null,
        house: (row as Record<string, unknown>).house as string || null,
        isPrefect: Boolean((row as Record<string, unknown>).isPrefect),
        prefectTitle: (row as Record<string, unknown>).prefectTitle as string || null,
      })),
    });
  } catch (error: unknown) {
    console.error("Fetch students error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch students" },
      { status: 500 }
    );
  }
}
