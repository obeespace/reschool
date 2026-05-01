import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Subject from "@/app/models/Subject";
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
    const rows = await Subject.find({ schoolId }).lean();

    return NextResponse.json({
      subjects: rows.map((row) => ({
        _id: (row._id as mongoose.Types.ObjectId).toString(),
        id: (row._id as mongoose.Types.ObjectId).toString(),
        name: row.name,
        code: row.code || row.name.split(/\s+/).map((p: string) => p[0]?.toUpperCase() || "").join("").slice(0, 6),
      })),
    });
  } catch (error: unknown) {
    console.error("Fetch subjects error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const name = String(body?.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Subject name is required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const existing = await Subject.findOne({ schoolId, name }).lean();
    if (existing) {
      return NextResponse.json({
        message: "Subject already exists",
        subject: {
          _id: (existing._id as mongoose.Types.ObjectId).toString(),
          id: (existing._id as mongoose.Types.ObjectId).toString(),
          name: existing.name,
        },
      });
    }

    const code = name.split(/\s+/).map((p: string) => p[0]?.toUpperCase() || "").join("").slice(0, 6);
    const subject = await Subject.create({ schoolId, name, code });

    return NextResponse.json({
      message: "Subject created successfully",
      subject: {
        _id: (subject._id as mongoose.Types.ObjectId).toString(),
        id: (subject._id as mongoose.Types.ObjectId).toString(),
        name: subject.name,
        code: subject.code,
      },
    });
  } catch (error: unknown) {
    console.error("Create subject error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create subject" },
      { status: 500 }
    );
  }
}
