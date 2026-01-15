import connectDB from "@/app/utils/db";
import School from "@/app/models/School";
import { hasFeature } from "@/app/utils/featureGuard";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await connectDB();
  const token = req.headers.get("authorization")?.split(" ")[1];
  const admin: any = verifyToken(token || "");

  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!(await hasFeature(admin.schoolId, "BRANDING"))) {
    return NextResponse.json({ error: "Upgrade required" }, { status: 403 });
  }

  const { logo, primaryColor } = await req.json();

  if (!logo || !primaryColor) {
    return NextResponse.json({ error: "Logo and primary color are required" }, { status: 400 });
  }

  const school = await School.findByIdAndUpdate(
    admin.schoolId, 
    { branding: { logo, primaryColor } },
    { new: true }
  );

  if (!school) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
