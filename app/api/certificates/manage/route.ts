import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Certificate from "@/app/models/Certificate";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    const filter: Record<string, unknown> = { schoolId };
    if (studentId) filter.studentId = new mongoose.Types.ObjectId(studentId);

    const certs = await Certificate.find(filter).lean();
    return NextResponse.json({ certificates: certs });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch certificates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const studentId = String(body?.studentId || "").trim();
    const certificateType = String(body?.certificateType || "COMPLETION").trim().toUpperCase();
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const certificateNumber = `CERT/${schoolId.toString().slice(-4).toUpperCase()}/${Date.now()}`;

    const cert = await Certificate.create({
      schoolId,
      studentId: new mongoose.Types.ObjectId(studentId),
      certificateType,
      certificateNumber,
      signatureApprovalStatus: "PENDING",
      isVerifiable: false,
      reprintCount: 0,
      reprintHistory: [],
    });

    return NextResponse.json({ message: "Certificate created", certificateId: cert._id.toString() }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create certificate" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const id = String(body?.id || "").trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await connectDB();
    await Certificate.deleteOne({ _id: new mongoose.Types.ObjectId(id), schoolId: new mongoose.Types.ObjectId(admin.schoolId) });
    return NextResponse.json({ message: "Certificate deleted" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete certificate" }, { status: 500 });
  }
}
