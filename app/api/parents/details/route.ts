import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import Student from "@/app/models/Students";
import "@/app/models/Class";
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

    // Get parent ID from query parameter
    const url = new URL(req.url);
    const parentId = url.searchParams.get("parentId");

    if (!parentId) {
      return NextResponse.json(
        { error: "Parent ID is required" },
        { status: 400 }
      );
    }

    // Fetch parent
    const parent = await User.findOne({
      _id: parentId,
      schoolId: user!.schoolId,
      role: "PARENT",
      isActive: true
    }).select("fullName email");

    if (!parent) {
      return NextResponse.json(
        { error: "Parent not found" },
        { status: 404 }
      );
    }

    // Fetch all wards (students) for this parent
    const wards = await Student.find({
      schoolId: user!.schoolId,
      parentId: parentId
    })
      .populate("currentClassId", "name")
      .select("fullName admissionNumber dateOfBirth gender currentClassId");

    return NextResponse.json({
      parent: {
        id: parent._id.toString(),
        fullName: parent.fullName,
        email: parent.email,
      },
      wards: wards.map(w => ({
        id: w._id.toString(),
        fullName: w.fullName,
        admissionNumber: w.admissionNumber,
        dateOfBirth: w.dateOfBirth,
        gender: w.gender,
        className: (w.currentClassId as any)?.name || "N/A"
      })),
      wardCount: wards.length
    });
  } catch (error: any) {
    console.error("Fetch parent details error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch parent details" },
      { status: 500 }
    );
  }
}
