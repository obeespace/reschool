import connectDB from "@/app/utils/db";
import School from "@/app/models/School";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    const schoolId = new mongoose.Types.ObjectId();

    const passwordHash = await bcrypt.hash(password, 10);
    const adminUser = await User.create({
      fullName: `${name} Admin`,
      email,
      passwordHash,
      role: "ADMIN",
      schoolId
    });

    const slug = name.toLowerCase().replace(/\s/g, "-");
    const school = await School.create({
      _id: schoolId,
      name,
      domainSlug: slug,
      adminUserId: adminUser._id
    });

    return NextResponse.json({
      schoolId: school._id.toString(),
      adminUserId: adminUser._id.toString()
    });
  } catch (error: any) {
    console.error("School registration error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to register school" },
      { status: 500 }
    );
  }
}
