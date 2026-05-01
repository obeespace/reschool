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
    const { searchParams } = new URL(req.url);
    const classIdQ = searchParams.get("classId");

    const query: object = classIdQ
      ? { schoolId, _id: new mongoose.Types.ObjectId(classIdQ) }
      : { schoolId };

    const rows = await Class.find(query).lean();
    return NextResponse.json({
      sections: rows.map((c) => ({
        id: c._id.toString(),
        schoolId: c.schoolId.toString(),
        classId: c._id.toString(),
        armId: c._id.toString(),
        name: `${c.level} ${c.arm}`.trim(),
        className: c.level,
        armName: c.arm,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list sections" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const level = String(body?.level || body?.classId || "").trim();
    const arm = String(body?.arm || body?.armId || "").trim();
    if (!level || !arm) return NextResponse.json({ error: "level and arm are required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const existing = await Class.findOne({ schoolId, level, arm }).lean();
    if (existing) return NextResponse.json({ error: "Section already exists" }, { status: 409 });

    const doc = await Class.create({ schoolId, level, arm });
    return NextResponse.json({ message: "Section created", section: { id: doc._id.toString(), name: `${level} ${arm}` } }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create section" }, { status: 500 });
  }
}
