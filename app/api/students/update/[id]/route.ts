import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { students } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const name = String(fullName || "").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] || "Student", lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Student id is required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const body = await req.json();
    const fullName = String(body?.fullName || "").trim();
    const admissionNumber = String(body?.admissionNumber || "").trim();
    const gender = body?.gender ? String(body.gender).trim() : null;
    const dateOfBirth = body?.dateOfBirth ? new Date(body.dateOfBirth) : null;

    if (!fullName || !admissionNumber) {
      return NextResponse.json(
        { error: "Full name and admission number are required" },
        { status: 400 }
      );
    }

    const names = splitFullName(fullName);
    const now = new Date();

    await d1
      .update(students)
      .set({
        firstName: names.firstName,
        lastName: names.lastName,
        admissionNumber,
        gender,
        dateOfBirth,
        updatedAt: now,
      })
      .where(and(eq(students.id, id), eq(students.schoolId, user.schoolId)));

    return NextResponse.json({
      message: "Student updated successfully",
      student: {
        id,
        fullName,
        admissionNumber,
        gender,
        dateOfBirth,
      },
    });
  } catch (error: unknown) {
    console.error("Update student error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update student" },
      { status: 500 }
    );
  }
}