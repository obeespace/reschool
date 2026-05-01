import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ClassModel from "@/app/models/Class";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const level = String(body?.level || "").trim().toUpperCase();
    const arm = String(body?.arm || "").trim().toUpperCase();

    if (!level || !arm) {
      return NextResponse.json({ error: "Level and arm are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const existing = await ClassModel.findOne({ schoolId, level, arm }).lean();

    if (existing) {
      return NextResponse.json({
        message: "Class already existed; section ensured",
        className: `${level} ${arm}`,
        class: {
          _id: (existing._id as mongoose.Types.ObjectId).toString(),
          id: (existing._id as mongoose.Types.ObjectId).toString(),
          name: `${level} ${arm}`,
          level,
          arm,
        },
      });
    }

    const cls = await ClassModel.create({ schoolId, level, arm, subjectIds: [], studentIds: [] });

    return NextResponse.json({
      message: "Class created successfully",
      className: `${level} ${arm}`,
      class: {
        _id: (cls._id as mongoose.Types.ObjectId).toString(),
        id: (cls._id as mongoose.Types.ObjectId).toString(),
        name: `${level} ${arm}`,
        level,
        arm,
      },
    });
  } catch (error: unknown) {
    console.error("Create class error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create class" },
      { status: 500 }
    );
  }
}
