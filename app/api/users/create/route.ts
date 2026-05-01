import bcrypt from "bcryptjs";
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import ParentWardLink from "@/app/models/ParentWardLink";
import Student from "@/app/models/Students";
import User from "@/app/models/User";
import connectDB from "@/app/utils/db";

type Role = "ADMIN" | "TEACHER" | "PARENT";

function sanitizeRole(value: string): Role | null {
  if (value === "ADMIN" || value === "TEACHER" || value === "PARENT") return value;
  return null;
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    if (!mongoose.isValidObjectId(admin.schoolId)) {
      return NextResponse.json({ error: "Invalid school context" }, { status: 400 });
    }

    const schoolObjectId = new mongoose.Types.ObjectId(admin.schoolId);

    const body = await req.json();
    const fullName = String(body?.fullName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const role = sanitizeRole(String(body?.role || ""));
    const wardIds = Array.isArray(body?.wardIds)
      ? body.wardIds.map((value: unknown) => String(value || "").trim()).filter(Boolean)
      : [];

    if (!fullName || !email || password.length < 6 || !role) {
      return NextResponse.json(
        {
          error:
            "fullName, valid email, role (ADMIN|TEACHER|PARENT), and password (min 6 chars) are required",
        },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ schoolId: schoolObjectId, email }).select("_id").lean();

    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    const userId = new mongoose.Types.ObjectId();
    const passwordHash = await bcrypt.hash(password, 10);

    if (role === "PARENT" && wardIds.length > 0) {
      const validWardObjectIds = wardIds.filter((id: string) => mongoose.isValidObjectId(id));
      if (validWardObjectIds.length !== wardIds.length) {
        return NextResponse.json({ error: "One or more ward IDs are invalid" }, { status: 400 });
      }

      const studentRows = await Student.find({
        _id: { $in: validWardObjectIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
        schoolId: schoolObjectId,
      })
        .select("_id")
        .lean();

      if (studentRows.length !== wardIds.length) {
        return NextResponse.json({ error: "One or more ward IDs are invalid" }, { status: 400 });
      }
    }

    await User.create({
      _id: userId,
      schoolId: schoolObjectId,
      fullName,
      email,
      passwordHash,
      role,
      isActive: true,
    });

    if (role === "PARENT" && wardIds.length > 0) {
      const links = wardIds.map((studentId: string, index: number) => ({
        schoolId: schoolObjectId,
        parentId: userId,
        studentId: new mongoose.Types.ObjectId(studentId),
        relationship: "GUARDIAN",
        isPrimary: index === 0,
      }));
      await ParentWardLink.insertMany(links, { ordered: true });
    }

    return NextResponse.json({
      message: "User created successfully",
      user: {
        id: userId.toString(),
        fullName,
        email,
        role,
      },
      linkedWards: role === "PARENT" ? wardIds.length : undefined,
    });
  } catch (error: unknown) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: 500 }
    );
  }
}