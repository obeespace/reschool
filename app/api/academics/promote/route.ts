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
      const stu = student as { _id: mongoose.Types.ObjectId; admissionNumber: string; fullName: string };
      await Student.updateOne({ _id: stu._id }, { $set: { currentClassId: toClassOId } });

      const toClassDoc = toClass as { level: string; arm: string };
      const fromClassDoc = await Class.findOne({ schoolId, _id: fromClassOId }).lean() as { level: string; arm: string } | null;

      // Check if lifecycle record already exists
      const existing = await StudentLifecycleRecord.findOne({ schoolId, studentId: stu._id }).lean();
      if (existing) {
        await StudentLifecycleRecord.updateOne(
          { schoolId, studentId: stu._id },
          {
            $set: { currentClass: `${toClassDoc.level} ${toClassDoc.arm}` },
            $push: {
              milestones: {
                academicYear: String(now.getFullYear()),
                term: 0,
                classLevel: fromClassDoc?.level || "",
                classArm: fromClassDoc?.arm || "",
                termAverage: 0,
                promoted: true,
                action: "PROMOTED",
              },
            },
          }
        );
      } else {
        await StudentLifecycleRecord.create({
          schoolId,
          studentId: stu._id,
          admissionDate: now,
          admissionClass: fromClassDoc ? `${fromClassDoc.level} ${fromClassDoc.arm}` : "Unknown",
          currentClass: `${toClassDoc.level} ${toClassDoc.arm}`,
          currentStatus: "ACTIVE",
          suspensionCount: 0,
          overallPerformance: { consistencyScore: 0 },
          milestones: [
            {
              academicYear: String(now.getFullYear()),
              term: 0,
              classLevel: fromClassDoc?.level || "",
              classArm: fromClassDoc?.arm || "",
              termAverage: 0,
              promoted: true,
              action: "PROMOTED",
            },
          ],
        });
      }
    }

    return NextResponse.json({ message: "Students promoted", promoted: toPromote.length, fromClassId, toClassId });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to promote students" }, { status: 500 });
  }
}
