import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import { allowRoles } from "@/app/utils/permissions";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await connectDB();
  const token = req.headers.get("authorization")?.split(" ")[1];
  const user = verifyToken(token || "");
  if (!allowRoles(user, ["ADMIN"])) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { fullName, email, password, role } = await req.json();
  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    fullName,
    email,
    passwordHash,
    role,
    schoolId: user!.schoolId
  });

  return NextResponse.json({ userId: newUser._id.toString() });
}
