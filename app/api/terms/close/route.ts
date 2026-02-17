import connectDB from "@/app/utils/db";
import Term from "@/app/models/Term";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: any = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { termId } = await req.json();

    if (!termId) {
      return NextResponse.json(
        { error: "Term ID is required" },
        { status: 400 }
      );
    }

    const term = await Term.findById(termId);

    if (!term || term.schoolId.toString() !== admin.schoolId) {
      return NextResponse.json(
        { error: "Term not found" },
        { status: 404 }
      );
    }

    term.isClosed = true;
    term.isActive = false; // Close term also deactivates it
    await term.save();

    return NextResponse.json({
      message: "Term closed successfully. No further edits allowed.",
      termId: term._id.toString()
    });
  } catch (error: any) {
    console.error("Close term error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to close term" },
      { status: 500 }
    );
  }
}
