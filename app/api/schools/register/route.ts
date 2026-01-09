import connectDB from "@/app/utils/db";
import School from "@/app/models/School";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await connectDB();
  const { name, email, password } = await req.json();

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
}
