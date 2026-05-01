import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import User from "@/app/models/User";
import ParentWardLink from "@/app/models/ParentWardLink";
import Class from "@/app/models/Class";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const students = await Student.find({ schoolId }).lean();
    const studentIds = students.map((s) => s._id);
    const wardLinks = studentIds.length ? await ParentWardLink.find({ schoolId, studentId: { $in: studentIds } }).lean() : [];
    const parentIds = [...new Set(wardLinks.map((w) => w.parentId))];
    const parents = parentIds.length ? await User.find({ _id: { $in: parentIds } }).select("_id fullName email").lean() : [];
    const parentMap = new Map(parents.map((p) => [p._id.toString(), p]));
    const classIds = [...new Set(students.map((s) => s.currentClassId?.toString()).filter(Boolean))];
    const classes = classIds.length ? await Class.find({ _id: { $in: classIds } }).lean() : [];
    const classMap = new Map(classes.map((c) => [c._id.toString(), c]));
    const parentByStudent = new Map<string, string>();
    for (const link of wardLinks) parentByStudent.set(link.studentId.toString(), link.parentId.toString());
    return NextResponse.json({
      data: students.map((s) => {
        const parentId = parentByStudent.get(s._id.toString());
        const parent = parentId ? parentMap.get(parentId) : null;
        const cls = s.currentClassId ? classMap.get(s.currentClassId.toString()) : null;
        return {
          studentName: (s as {fullName: string}).fullName,
          admissionNumber: (s as {admissionNumber: string}).admissionNumber,
          class: cls ? `${(cls as {level: string}).level} ${(cls as {arm: string}).arm}` : "N/A",
          parentName: parent ? (parent as {fullName: string}).fullName : "N/A",
          parentEmail: parent ? (parent as {email: string}).email : "N/A",
        };
      })
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 });
  }
}
