import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { schools, students, users } from "@/app/db/schema";

export async function GET() {
  try {
    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json(
        {
          ok: false,
          service: "week1-test",
          dbConfigured: false,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    const [schoolRows, userRows, studentRows] = await Promise.all([
      d1.select({ id: schools.id }).from(schools),
      d1.select({ id: users.id }).from(users),
      d1.select({ id: students.id }).from(students),
    ]);

    return NextResponse.json({
      ok: true,
      service: "week1-test",
      dbConfigured: true,
      timestamp: new Date().toISOString(),
      stats: {
        schools: schoolRows.length,
        users: userRows.length,
        students: studentRows.length,
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