import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import { allowRoles } from "@/app/utils/permissions";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");

    if (!allowRoles(user, ["ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const parents = await User.find({
      schoolId: user!.schoolId,
      role: "PARENT",
      isActive: true
    }).select("fullName email wardIds");

    return NextResponse.json({
      parents: parents.map(parent => ({
        id: parent._id.toString(),
        fullName: parent.fullName,
        email: parent.email,
        wardCount: parent.wardIds?.length || 0
      }))
    });
  } catch (error: any) {
    console.error("Fetch parents error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch parents" },
      { status: 500 }
    );
  }
}
