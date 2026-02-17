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

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");
    const onlyPaid = searchParams.get("onlyPaid") === "true";

    const query: any = { schoolId: user.schoolId };
    
    if (academicYearId) {
      query.academicYearId = academicYearId;
    }

    if (onlyPaid) {
      query.isPaid = true;
    }

    const terms = await Term.find(query)
      .populate("academicYearId", "name")
      .sort({ startDate: -1 });

    return NextResponse.json({ terms });
  } catch (error: any) {
    console.error("Fetch terms error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch terms" },
      { status: 500 }
    );
  }
}
