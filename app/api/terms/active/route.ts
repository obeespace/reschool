import connectDB from "@/app/utils/db";
import Term from "@/app/models/Term";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const activeTerm = await Term.findOne({
      schoolId: user.schoolId,
      isActive: true
    }).populate("academicYearId", "name");

    if (!activeTerm) {
      return NextResponse.json(
        { error: "No active term found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      term: activeTerm,
      isPaid: activeTerm.isPaid,
      isClosed: activeTerm.isClosed
    });
  } catch (error: any) {
    console.error("Fetch active term error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch active term" },
      { status: 500 }
    );
  }
}
