import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ClassModel from "@/app/models/Class";
import Subject from "@/app/models/Subject";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const classId = String(body?.classId || "").trim();
    const subjectIds: string[] = Array.isArray(body?.subjectIds)
      ? body.subjectIds.map((v: unknown) => String(v || "").trim()).filter(Boolean)
      : [];

    if (!classId || subjectIds.length === 0) {
      return NextResponse.json({ error: "classId and at least one subjectId are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const [classDoc, subjectDocs] = await Promise.all([
      ClassModel.findOne({ _id: classId, schoolId }).select("_id").lean(),
      Subject.find({ _id: { $in: subjectIds }, schoolId }).select("_id").lean(),
    ]);

    if (!classDoc || subjectDocs.length !== subjectIds.length) {
      return NextResponse.json({ error: "Class or one or more subjects not found" }, { status: 404 });
    }

    await ClassModel.findByIdAndUpdate(classId, {
      subjectIds: subjectIds.map((id) => new mongoose.Types.ObjectId(id)),
    });

    return NextResponse.json({ message: "Class subjects updated successfully" });
  } catch (error: unknown) {
    console.error("Link class subjects error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to link class subjects" },
      { status: 500 }
    );
  }
}
