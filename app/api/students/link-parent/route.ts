import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import User from "@/app/models/User";
import ParentWardLink from "@/app/models/ParentWardLink";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const studentId = String(body?.studentId || "").trim();
    const parentId = String(body?.parentId || "").trim();
    const relationship = String(body?.relationship || "GUARDIAN").trim().toUpperCase();
    const isPrimary = body?.isPrimary === true;

    if (!studentId || !parentId) {
      return NextResponse.json({ error: "studentId and parentId are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const [studentDoc, parentDoc] = await Promise.all([
      Student.findOne({ _id: studentId, schoolId }).select("_id").lean(),
      User.findOne({ _id: parentId, schoolId, role: "PARENT" }).select("_id").lean(),
    ]);

    if (!studentDoc || !parentDoc) {
      return NextResponse.json({ error: "Student or parent not found" }, { status: 404 });
    }

    if (isPrimary) {
      await ParentWardLink.updateMany({ schoolId, studentId: new mongoose.Types.ObjectId(studentId) }, { isPrimary: false });
    }

    await ParentWardLink.findOneAndUpdate(
      { schoolId, parentId: new mongoose.Types.ObjectId(parentId), studentId: new mongoose.Types.ObjectId(studentId) },
      { relationship, isPrimary },
      { upsert: true }
    );

    return NextResponse.json({ message: "Parent linked successfully" });
  } catch (error: unknown) {
    console.error("Link parent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to link parent" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = String(searchParams.get("studentId") || "").trim();
    const parentId = String(searchParams.get("parentId") || "").trim();

    if (!studentId || !parentId) {
      return NextResponse.json({ error: "studentId and parentId are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    await ParentWardLink.findOneAndDelete({
      schoolId,
      studentId: new mongoose.Types.ObjectId(studentId),
      parentId: new mongoose.Types.ObjectId(parentId),
    });

    return NextResponse.json({ message: "Parent link removed successfully" });
  } catch (error: unknown) {
    console.error("Unlink parent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to unlink parent" },
      { status: 500 }
    );
  }
}
