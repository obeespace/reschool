import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import FeeRecord from "@/app/models/FeeRecord";
import mongoose from "mongoose";

// PATCH /api/fees/pay — record a payment against a specific fee type in an existing record
export async function PATCH(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const { studentId, termId, feeType, amountPaid, receiptNumber } = body;
    if (!studentId || !termId || !feeType || amountPaid === undefined) {
      return NextResponse.json({ error: "studentId, termId, feeType, amountPaid are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const record = await FeeRecord.findOne({
      schoolId,
      studentId: new mongoose.Types.ObjectId(studentId),
      termId: new mongoose.Types.ObjectId(termId),
    });
    if (!record) return NextResponse.json({ error: "Fee record not found" }, { status: 404 });

    const feeItem = record.fees.find((f: { feeType: string; amountPaid: number; amountDue: number; balance: number; isPaid: boolean; paidDate?: Date; receiptNumber?: string; recordedBy?: unknown }) => f.feeType === feeType);
    if (!feeItem) return NextResponse.json({ error: `Fee type '${feeType}' not found in record` }, { status: 404 });

    feeItem.amountPaid = Number(amountPaid);
    feeItem.balance = feeItem.amountDue - feeItem.amountPaid;
    feeItem.isPaid = feeItem.balance <= 0;
    feeItem.paidDate = new Date();
    if (receiptNumber) feeItem.receiptNumber = receiptNumber;
    feeItem.recordedBy = new mongoose.Types.ObjectId(admin.userId);

    record.totalPaid = record.fees.reduce((s: number, f: { amountPaid: number }) => s + f.amountPaid, 0);
    record.totalBalance = record.totalDue - record.totalPaid;
    await record.save();

    return NextResponse.json({ message: "Payment recorded", record });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to record payment" }, { status: 500 });
  }
}
