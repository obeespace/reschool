import connectDB from "@/app/utils/db";
import Subscription from "@/app/models/Subscription";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await connectDB();
  const token = req.headers.get("authorization")?.split(" ")[1];
  const admin: any = verifyToken(token || "");

  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const sub = await Subscription.findOne({ 
    schoolId: admin.schoolId,
    status: "INACTIVE"
  }).sort({ createdAt: -1 });

  if (!sub) {
    return NextResponse.json({ error: "No pending subscription found" }, { status: 404 });
  }

  sub.status = "ACTIVE";
  sub.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await sub.save();

  return NextResponse.json({ status: "Subscription activated" });
}
