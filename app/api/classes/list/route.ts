import connectDB from "@/app/utils/db";
import Class from "@/app/models/Class";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

// List all classes for the school
export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const classes = await Class.find({ schoolId: user.schoolId })
      .populate("classTeacherId", "fullName email")
      .populate("subjectIds", "name code")
      .sort({ level: 1, arm: 1 });

    return NextResponse.json({ classes });
  } catch (error: any) {
    console.error("List classes error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list classes" },
      { status: 500 }
    );
  }
}
