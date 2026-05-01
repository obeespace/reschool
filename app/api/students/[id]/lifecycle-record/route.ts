import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import StudentLifecycleRecord from "@/app/models/StudentLifecycleRecord";
import mongoose from "mongoose";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const record = await StudentLifecycleRecord.findOne({ schoolId, studentId: new mongoose.Types.ObjectId(id) }).lean();
    return NextResponse.json({ record: record || null });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch lifecycle record" }, { status: 500 });
  }
}
