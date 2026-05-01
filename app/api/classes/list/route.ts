import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
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
    const rows = await ClassModel.find({ schoolId }).lean();

    return NextResponse.json({
      classes: rows.map((row) => ({
        _id: (row._id as mongoose.Types.ObjectId).toString(),
        id: (row._id as mongoose.Types.ObjectId).toString(),
        name: `${row.level} ${row.arm}`,
        level: row.level,
        arm: row.arm,
        subjectIds: (row.subjectIds || []).map((id: mongoose.Types.ObjectId) => id.toString()),
      })),
    });
  } catch (error: unknown) {
    console.error("Fetch classes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch classes" },
      { status: 500 }
    );
  }
}
