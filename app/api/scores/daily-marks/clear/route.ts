import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");

    if (!academicYearId) {
      return NextResponse.json(
        { error: "Academic year ID is required" },
        { status: 400 }
      );
    }

    const result = await DailyMark.deleteMany({
      schoolId: user.schoolId,
      academicYearId
    });

    return NextResponse.json({
      message: `Deleted ${result.deletedCount} daily marks for the academic year`,
      deletedCount: result.deletedCount
    });

  } catch (error: any) {
    console.error("Error clearing daily marks:", error);
    return NextResponse.json(
      { error: error.message || "Failed to clear daily marks" },
      { status: 500 }
    );
  }
}
