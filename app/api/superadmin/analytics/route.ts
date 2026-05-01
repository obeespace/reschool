import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import School from "@/app/models/School";
import User from "@/app/models/User";
import Student from "@/app/models/Students";
import Subscription from "@/app/models/Subscription";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "SUPERADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schools = await School.find().lean();
    const schoolIds = schools.map((s) => (s as {_id: mongoose.Types.ObjectId})._id);

    const [userCounts, studentCounts, subscriptions] = await Promise.all([
      User.aggregate([
        { $match: { schoolId: { $in: schoolIds } } },
        { $group: { _id: "$schoolId", count: { $sum: 1 } } },
      ]),
      Student.aggregate([
        { $match: { schoolId: { $in: schoolIds } } },
        { $group: { _id: "$schoolId", count: { $sum: 1 } } },
      ]),
      Subscription.find({ schoolId: { $in: schoolIds } }).lean(),
    ]);

    const userMap = new Map(userCounts.map((u) => [u._id.toString(), u.count]));
    const studentMap = new Map(studentCounts.map((s) => [s._id.toString(), s.count]));
    const subMap = new Map(subscriptions.map((s) => [s.schoolId.toString(), s]));

    return NextResponse.json({
      totalSchools: schools.length,
      schools: schools.map((s) => {
        const sid = (s as {_id: mongoose.Types.ObjectId})._id.toString();
        const sub = subMap.get(sid);
        return {
          _id: sid,
          name: (s as {name: string}).name,
          domainSlug: (s as {domainSlug?: string}).domainSlug,
          userCount: userMap.get(sid) || 0,
          studentCount: studentMap.get(sid) || 0,
          subscription: sub ? { plan: (sub as {plan: string}).plan, status: (sub as {status: string}).status, expiresAt: (sub as {expiresAt?: Date}).expiresAt } : null,
        };
      }),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch superadmin analytics" }, { status: 500 });
  }
}
