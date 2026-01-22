import connectDB from "@/app/utils/db";
import Class from "@/app/models/Class";
import Subject from "@/app/models/Subject";
import { verifyToken } from "@/app/utils/auth";
import { allowRoles } from "@/app/utils/permissions";
import { NextResponse } from "next/server";

// Link subjects to a class
export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");
    
    if (!allowRoles(user, ["ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { classId, subjectIds } = await req.json();

    if (!classId || !subjectIds || !Array.isArray(subjectIds)) {
      return NextResponse.json(
        { error: "Class ID and subject IDs array are required" },
        { status: 400 }
      );
    }

    // Verify all subjects exist and belong to the same school
    const subjects = await Subject.find({
      _id: { $in: subjectIds },
      schoolId: user!.schoolId
    });

    if (subjects.length !== subjectIds.length) {
      return NextResponse.json(
        { error: "Some subjects not found or do not belong to your school" },
        { status: 400 }
      );
    }

    // Update the class with the subjects
    const updatedClass = await Class.findOneAndUpdate(
      { _id: classId, schoolId: user!.schoolId },
      { $set: { subjectIds } },
      { new: true }
    );

    if (!updatedClass) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Subjects linked to class successfully",
      class: updatedClass
    });
  } catch (error: any) {
    console.error("Link subjects error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to link subjects to class" },
      { status: 500 }
    );
  }
}
