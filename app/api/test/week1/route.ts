import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import School from "@/app/models/School";
import User from "@/app/models/User";
import Student from "@/app/models/Students";

export async function GET() {
  try {
    await connectDB();
    const [schoolCount, userCount, studentCount] = await Promise.all([
      School.countDocuments(),
      User.countDocuments(),
      Student.countDocuments(),
    ]);

    return NextResponse.json({
      ok: true,
      service: "week1-test",
      dbConfigured: true,
      timestamp: new Date().toISOString(),
      stats: {
        schools: schoolCount,
        users: userCount,
        students: studentCount,
      },
    });
  } catch (error: unknown) {
    console.error("Week1 GET test error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Week1 test failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({
      ok: true,
      message: "Week1 test POST received",
      received: body,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Week1 POST test failed" },
      { status: 500 }
    );
  }
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}