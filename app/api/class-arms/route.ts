import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Class from "@/app/models/Class";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const arms = await Class.distinct("arm", { schoolId });
    return NextResponse.json({ arms: arms.map((name: string) => ({ name })) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list class arms" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim().toUpperCase();
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    // Note: arms in MongoDB are just the arm field on Class docs; we return success
    return NextResponse.json({ message: "Class arm noted", arm: { name } }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create class arm" }, { status: 500 });
  }
}
