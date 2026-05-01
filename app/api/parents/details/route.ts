import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import ParentWardLink from "@/app/models/ParentWardLink";
import Student from "@/app/models/Students";
import Class from "@/app/models/Class";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const parentId = String(searchParams.get("parentId") || "").trim();
    if (!parentId) return NextResponse.json({ error: "parentId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const parentUser = await User.findOne({ schoolId, _id: new mongoose.Types.ObjectId(parentId), role: "PARENT" }).lean();
    if (!parentUser) return NextResponse.json({ error: "Parent not found" }, { status: 404 });

    const wardLinks = await ParentWardLink.find({ schoolId, parentId: new mongoose.Types.ObjectId(parentId) }).lean();
    const wardIds = wardLinks.map((w) => w.studentId);
    const wardStudents = wardIds.length ? await Student.find({ schoolId, _id: { $in: wardIds } }).lean() : [];

    const classIds = wardStudents.map((s) => s.currentClassId).filter(Boolean);
    const classes = classIds.length ? await Class.find({ _id: { $in: classIds } }).lean() : [];
    const classMap = new Map(classes.map((c) => [c._id.toString(), c]));

    return NextResponse.json({
      parent: { id: parentUser._id.toString(), fullName: parentUser.fullName, email: parentUser.email },
      wards: wardStudents.map((s) => {
        const cls = s.currentClassId ? classMap.get(s.currentClassId.toString()) : null;
        return {
          id: s._id.toString(),
          fullName: s.fullName,
          admissionNumber: s.admissionNumber,
          dateOfBirth: s.dateOfBirth,
          gender: s.gender,
          className: cls ? `${(cls as {level?: string}).level} ${(cls as {arm?: string}).arm}`.trim() : null,
        };
      }),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch parent details" }, { status: 500 });
  }
}
