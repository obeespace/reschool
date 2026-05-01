import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AdmissionSettings from "@/app/models/AdmissionSettings";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const settings = await AdmissionSettings.findOne({ schoolId: new mongoose.Types.ObjectId(user.schoolId) }).lean();
    return NextResponse.json({ settings: settings || null });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch admission settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const prefix = String(body?.prefix || "").trim();
    const yearFormat = body?.yearFormat;
    const numberLength = Number(body?.numberLength);
    if (!prefix || !["YYYY", "YY"].includes(yearFormat) || !Number.isFinite(numberLength)) {
      return NextResponse.json({ error: "Invalid admission settings payload" }, { status: 400 });
    }

    await connectDB();
    await AdmissionSettings.findOneAndUpdate(
      { schoolId: new mongoose.Types.ObjectId(admin.schoolId) },
      { $set: { prefix, yearFormat, numberLength } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: "Admission settings saved" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save admission settings" }, { status: 500 });
  }
}
