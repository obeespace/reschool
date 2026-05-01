import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ReportCard from "@/app/models/ReportCard";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const reportId = String(body?.reportId || body?.id || "").trim();
    if (!reportId) return NextResponse.json({ error: "reportId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const report = await ReportCard.findOne({ _id: new mongoose.Types.ObjectId(reportId), schoolId }).lean();
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (!report.approvedBy) return NextResponse.json({ error: "Report has not been released" }, { status: 403 });

    await ReportCard.updateOne(
      { _id: report._id },
      {
        $inc: { printCount: 1 },
        $push: { printHistory: { printDate: new Date(), printedBy: new mongoose.Types.ObjectId(user.userId) } },
      }
    );

    return NextResponse.json({ message: "Print recorded", reportId, report });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to record print" }, { status: 500 });
  }
}
