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

    const { termId, paymentReference } = await req.json();

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

    term.isPaid = true;
    term.paymentDate = new Date();
    if (paymentReference) {
      term.paymentReference = paymentReference;
    }
    await term.save();

    return NextResponse.json({
      message: "Term marked as paid successfully",
      term: {
        termId: term._id.toString(),
        termNumber: term.termNumber,
        isPaid: term.isPaid,
        paymentDate: term.paymentDate
      }
    });
  } catch (error: any) {
    console.error("Mark term paid error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark term as paid" },
      { status: 500 }
    );
  }
}
