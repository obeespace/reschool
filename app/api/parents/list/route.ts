import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import ParentWardLink from "@/app/models/ParentWardLink";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const parents = await User.find({ schoolId, role: "PARENT" }).select("_id fullName email").lean();
    const parentIds = parents.map((p) => p._id);

    const wardCounts = parentIds.length
      ? await ParentWardLink.aggregate([
          { $match: { schoolId, parentId: { $in: parentIds } } },
          { $group: { _id: "$parentId", count: { $sum: 1 } } },
        ])
      : [];
    const wardCountMap = new Map(wardCounts.map((w) => [w._id.toString(), w.count]));

    return NextResponse.json({
      parents: parents.map((p) => ({
        id: p._id.toString(),
        fullName: p.fullName,
        email: p.email,
        wardCount: wardCountMap.get(p._id.toString()) || 0,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch parents" }, { status: 500 });
  }
}
