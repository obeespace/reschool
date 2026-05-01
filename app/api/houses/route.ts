import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import HousePoints from "@/app/models/HousePoints";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

// GET /api/houses?termId=  — leaderboard + list of houses and their totals
export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const termId = searchParams.get("termId");

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const query: Record<string, unknown> = { schoolId };
    if (termId) query.termId = new mongoose.Types.ObjectId(termId);

    const entries = await HousePoints.find(query).sort({ createdAt: -1 }).lean();

    // Aggregate totals per house
    const totals: Record<string, number> = {};
    for (const e of entries) {
      totals[e.houseName] = (totals[e.houseName] ?? 0) + e.points;
    }
    const leaderboard = Object.entries(totals)
      .map(([house, points]) => ({ house, points }))
      .sort((a, b) => b.points - a.points);

    return NextResponse.json({ leaderboard, entries });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch house data" }, { status: 500 });
  }
}

// POST /api/houses — award points to a house
export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "TEACHER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { houseName, category, points, description, studentId, termId } = body;
    if (!houseName || !category || points === undefined || !description || !termId) {
      return NextResponse.json({ error: "houseName, category, points, description, termId are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const term = await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termId) }).lean();
    if (!term) return NextResponse.json({ error: "Term not found" }, { status: 404 });

    if (studentId) {
      const student = await Student.findOne({ schoolId, _id: new mongoose.Types.ObjectId(studentId) }).lean();
      if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const entry = await HousePoints.create({
      schoolId,
      academicYearId: term.academicYearId,
      termId: new mongoose.Types.ObjectId(termId),
      houseName,
      category,
      points: Number(points),
      description,
      studentId: studentId ? new mongoose.Types.ObjectId(studentId) : undefined,
      awardedBy: new mongoose.Types.ObjectId(admin.userId),
    });

    return NextResponse.json({ message: "Points awarded", entry });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to award points" }, { status: 500 });
  }
}

// PATCH /api/houses/assign — assign a student to a house
export async function PATCH(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const { studentId, house } = body;
    if (!studentId || !house) return NextResponse.json({ error: "studentId and house are required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const student = await Student.findOneAndUpdate(
      { schoolId, _id: new mongoose.Types.ObjectId(studentId) },
      { $set: { house } },
      { new: true }
    ).lean();

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    return NextResponse.json({ message: "House assigned", student });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to assign house" }, { status: 500 });
  }
}
