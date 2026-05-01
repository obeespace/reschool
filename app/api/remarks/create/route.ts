import connectDB from "@/app/utils/db";
import TeacherRemark from "@/app/models/TeacherRemark";
import "@/app/models/Subject";
import "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

// Teacher: Create or update a remark
export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user || user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const {
      type,
      studentId,
      classId,
      termId,
      academicYearId,
      subjectId,
      academicPerformance,
      classParticipation,
      attitudeToDuties,
      customRemark,
      promotionRecommendation
    } = await req.json();

    if (
      !type ||
      !studentId ||
      !classId ||
      !termId ||
      !academicYearId ||
      !academicPerformance ||
      !classParticipation ||
      !attitudeToDuties
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // For CLASS_TEACHER remarks, promotionRecommendation is expected
    if (type === "CLASS_TEACHER" && !promotionRecommendation) {
      return NextResponse.json(
        { error: "promotionRecommendation required for class teacher remarks" },
        { status: 400 }
      );
    }

    // Check if remark already exists
    const query: any = {
      schoolId: user.schoolId,
      studentId,
      termId,
      type
    };
    if (type === "SUBJECT") query.subjectId = subjectId;

    const existingRemark = await TeacherRemark.findOne(query);

    let remark;
    if (existingRemark) {
      // Update existing
      existingRemark.academicPerformance = academicPerformance;
      existingRemark.classParticipation = classParticipation;
      existingRemark.attitudeToDuties = attitudeToDuties;
      existingRemark.customRemark = customRemark;
      if (type === "CLASS_TEACHER") {
        existingRemark.promotionRecommendation = promotionRecommendation;
      }
      remark = await existingRemark.save();
    } else {
      // Create new
      remark = await TeacherRemark.create({
        schoolId: user.schoolId,
        studentId,
        classId,
        termId,
        academicYearId,
        type,
        subjectId: type === "SUBJECT" ? subjectId : null,
        academicPerformance,
        classParticipation,
        attitudeToDuties,
        customRemark,
        remarkedBy: user.userId,
        remarkedDate: new Date(),
        promotionRecommendation: type === "CLASS_TEACHER" ? promotionRecommendation : null
      });
    }

    return NextResponse.json({
      message: existingRemark ? "Remark updated successfully" : "Remark created successfully",
      remarkId: remark._id.toString()
    });
  } catch (error: any) {
    console.error("Create/Update remark error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save remark" },
      { status: 500 }
    );
  }
}

// Get remarks for a student in a term
export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const termId = searchParams.get("termId");

    if (!studentId || !termId) {
      return NextResponse.json(
        { error: "studentId and termId required" },
        { status: 400 }
      );
    }

    const remarks = await TeacherRemark.find({
      schoolId: user.schoolId,
      studentId,
      termId
    })
      .populate("subjectId", "name code")
      .populate("remarkedBy", "fullName")
      .lean();

    // Organize by type
    const subjectRemarks = remarks.filter((r: any) => r.type === "SUBJECT");
    const classTeacherRemark = remarks.find((r: any) => r.type === "CLASS_TEACHER");

    return NextResponse.json({
      classTeacherRemark: classTeacherRemark || null,
      subjectRemarks
    });
  } catch (error: any) {
    console.error("Fetch remarks error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch remarks" },
      { status: 500 }
    );
  }
}
