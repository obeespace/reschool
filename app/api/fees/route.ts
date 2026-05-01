import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import FeeRecord from "@/app/models/FeeRecord";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

// GET /api/fees?termId=&classId=  — list fee records for a class/term (defaulters list)
export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const termId = searchParams.get("termId");
    const classId = searchParams.get("classId");
    const studentId = searchParams.get("studentId");

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const query: Record<string, unknown> = { schoolId };
    if (termId) query.termId = new mongoose.Types.ObjectId(termId);
    if (studentId) query.studentId = new mongoose.Types.ObjectId(studentId);

    let records = await FeeRecord.find(query)
      .populate("studentId", "fullName admissionNumber currentClassId")
      .lean();

    // Filter by classId if provided (via populated student)
    if (classId) {
      records = records.filter(
        (r) => (r.studentId as { currentClassId?: mongoose.Types.ObjectId })?.currentClassId?.toString() === classId
      );
    }

    return NextResponse.json({ records });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch fees" }, { status: 500 });
  }
}

// POST /api/fees — create or update fee record for a student in a term
export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const { studentId, termId, fees } = body;
    if (!studentId || !termId || !Array.isArray(fees) || fees.length === 0) {
      return NextResponse.json({ error: "studentId, termId, and fees[] are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const student = await Student.findOne({ schoolId, _id: new mongoose.Types.ObjectId(studentId) }).lean();
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const term = await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termId) }).lean();
    if (!term) return NextResponse.json({ error: "Term not found" }, { status: 404 });

    const recordedBy = new mongoose.Types.ObjectId(admin.userId);
    const feeItems = fees.map((f: { feeType: string; label: string; amountDue: number; amountPaid?: number; receiptNumber?: string }) => {
      const amountPaid = f.amountPaid ?? 0;
      const balance = (f.amountDue ?? 0) - amountPaid;
      return {
        feeType: f.feeType,
        label: f.label,
        amountDue: f.amountDue,
        amountPaid,
        balance,
        isPaid: balance <= 0,
        paidDate: amountPaid > 0 ? new Date() : undefined,
        receiptNumber: f.receiptNumber,
        recordedBy,
      };
    });

    const totalDue = feeItems.reduce((s: number, f: { amountDue: number }) => s + f.amountDue, 0);
    const totalPaid = feeItems.reduce((s: number, f: { amountPaid: number }) => s + f.amountPaid, 0);
    const totalBalance = totalDue - totalPaid;

    const record = await FeeRecord.findOneAndUpdate(
      { schoolId, studentId: new mongoose.Types.ObjectId(studentId), termId: new mongoose.Types.ObjectId(termId) },
      {
        $set: {
          academicYearId: term.academicYearId,
          termNumber: term.termNumber,
          fees: feeItems,
          totalDue,
          totalPaid,
          totalBalance,
          createdBy: recordedBy,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: "Fee record saved", record });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save fee record" }, { status: 500 });
  }
}
