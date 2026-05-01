import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import Class from "@/app/models/Class";
import StudentLifecycleRecord from "@/app/models/StudentLifecycleRecord";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const fromClassId = searchParams.get("fromClassId");
    if (!fromClassId) return NextResponse.json({ error: "fromClassId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const students = await Student.find({ schoolId, currentClassId: new mongoose.Types.ObjectId(fromClassId) }).lean();
    return NextResponse.json({ students: students.map((s) => ({ _id: (s as {_id: mongoose.Types.ObjectId})._id.toString(), fullName: (s as {fullName: string}).fullName, admissionNumber: (s as {admissionNumber: string}).admissionNumber })), count: students.length });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to preview promotion" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const fromClassId = String(body?.fromClassId || "").trim();
    const toClassId = String(body?.toClassId || "").trim();
    const studentIds: string[] = Array.isArray(body?.studentIds) ? body.studentIds.map(String) : [];
    if (!fromClassId || !toClassId) return NextResponse.json({ error: "fromClassId and toClassId are required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const fromClassOId = new mongoose.Types.ObjectId(fromClassId);
    const toClassOId = new mongoose.Types.ObjectId(toClassId);

    const toClass = await Class.findOne({ schoolId, _id: toClassOId }).lean();
    if (!toClass) return NextResponse.json({ error: "Target class not found" }, { status: 404 });

    const filter = studentIds.length
      ? { schoolId, _id: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) }, currentClassId: fromClassOId }
      : { schoolId, currentClassId: fromClassOId };

    const toPromote = await Student.find(filter).lean();
    const now = new Date();

    for (const student of toPromote) {
      await Student.updateOne({ _id: (student as {_id: mongoose.Types.ObjectId})._id }, { $set: { currentClassId: toClassOId } });
      await StudentLifecycleRecord.findOneAndUpdate(
        { schoolId, studentId: (student as {_id: mongoose.Types.ObjectId})._id },
        {
          $push: {
            events: {
              type: "PROMOTION",
              fromClassId: fromClassOId,
              toClassId: toClassOId,
              performedBy: new mongoose.Types.ObjectId(admin.userId),
              date: now,
            },
          },
        },
        { upsert: true }
      );
    }

    return NextResponse.json({ message: "Students promoted", promoted: toPromote.length, fromClassId, toClassId });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to promote students" }, { status: 500 });
  }
}
