import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { students } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(
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

    await d1
      .delete(students)
      .where(and(eq(students.id, id), eq(students.schoolId, user.schoolId)));

    return NextResponse.json({ message: "Student deleted successfully" });
  } catch (error: unknown) {
    console.error("Delete student error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete student" },
      { status: 500 }
    );
  }
}