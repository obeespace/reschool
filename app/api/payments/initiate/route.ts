import connectDB from "@/app/utils/db";
import Subscription from "@/app/models/Subscription";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

const PLAN_AMOUNT: any = {
  STARTER: 25000,
  PRO: 60000,
  ENTERPRISE: 150000
};

export async function POST(req: Request) {
  await connectDB();
  const token = req.headers.get("authorization")?.split(" ")[1];
  const admin: any = verifyToken(token || "");

  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { plan } = await req.json();

  if (!PLAN_AMOUNT[plan]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const existing = await Subscription.findOne({ 
    schoolId: admin.schoolId, 
    status: "ACTIVE" 
  });
  
  if (existing) {
    return NextResponse.json({ error: "Active subscription exists" }, { status: 400 });
  }

  const reference = `IGB-${Date.now()}`;

  // TODO: Integrate with payment gateway
  // Instead of creating subscription here, redirect to payment gateway
  // const paymentUrl = await initiatePaymentWithGateway({
  //   reference,
  //   amount: PLAN_AMOUNT[plan],
  //   email: admin.email
  // });

  await Subscription.create({
    schoolId: admin.schoolId,
    plan,
    status: "INACTIVE"
  });

  return NextResponse.json({
    reference,
    amount: PLAN_AMOUNT[plan],
    email: admin.email
  });
}
