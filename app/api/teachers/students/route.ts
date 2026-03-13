import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.split(" ")[1];
  const teacher: ITokenPayload | null = verifyToken(token || "");

  if (!teacher || teacher.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({
    classTeacherOf: null,
    students: [],
    warning: "Class teacher to class mapping is pending D1 migration.",
  });
}