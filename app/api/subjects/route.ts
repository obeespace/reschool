import connectDB from "@/app/utils/db";
import Subject from "@/app/models/Subject";
import { verifyToken } from "@/app/utils/auth";
import { allowRoles } from "@/app/utils/permissions";
import { NextResponse } from "next/server";

// Create a new subject
export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");
    
    if (!allowRoles(user, ["ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, code } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Subject name is required" },
        { status: 400 }
      );
    }

    const subject = await Subject.create({
      schoolId: user!.schoolId,
      name,
      code
    });

    return NextResponse.json({
      subjectId: subject._id.toString(),
      message: "Subject created successfully"
    });
  } catch (error: any) {
    console.error("Subject creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create subject" },
      { status: 500 }
    );
  }
}

// Get all subjects for the school
export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const subjects = await Subject.find({ schoolId: user.schoolId })
      .select("name code")
      .sort({ name: 1 });

    return NextResponse.json({ subjects });
  } catch (error: any) {
    console.error("Fetch subjects error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}
