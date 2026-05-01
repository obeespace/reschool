import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { terms } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import {
  checkTermTransitionSafety,
  getStudentEnrollmentHistory,
  verifyStudentTranscriptIntegrity,
  validateTermActivationSafety,
} from "@/app/utils/termTransitionGuard";

type HistoryCheckRequest = {
  studentId?: string;
  newTermId?: string;
  action?: "check_safety" | "verify_transcript" | "validate_activation";
};

/**
 * GET: Check term transition safety and historical data preservation
 * POST: Validate transcript integrity or term activation safety
 *
 * Only admins can access these endpoints
 */

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const action = String(searchParams.get("action") || "check_safety").trim();
    const studentId = String(searchParams.get("studentId") || "").trim();

    if (action === "verify_transcript") {
      if (!studentId) {
        return NextResponse.json({ error: "studentId is required for transcript verification" }, { status: 400 });
      }

      const integrity = await verifyStudentTranscriptIntegrity(d1, admin.schoolId, studentId);
      return NextResponse.json(integrity);
    }

    if (action === "check_safety") {
      const allTerms = await d1
        .select({ id: terms.id, isCurrent: terms.isCurrent, termNumber: terms.termNumber })
        .from(terms)
        .where(eq(terms.schoolId, admin.schoolId))
        .orderBy(terms.termNumber);

      const currentTermRows = allTerms.filter((t) => t.isCurrent);
      const previousTermRows = allTerms.filter((t) => !t.isCurrent && t.termNumber === (currentTermRows[0]?.termNumber || 1) - 1);

      if (!currentTermRows[0] || !previousTermRows[0]) {
        return NextResponse.json({
          safe: true,
          message: "Not enough terms for transition check",
          transitions: [],
        });
      }

      const safety = await checkTermTransitionSafety(
        d1,
        admin.schoolId,
        previousTermRows[0].id,
        currentTermRows[0].id
      );

      return NextResponse.json(safety);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Term history check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check term history" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({})) as HistoryCheckRequest;
    const action = String(body.action || "validate_activation").trim();
    const studentId = String(body.studentId || "").trim();
    const newTermId = String(body.newTermId || "").trim();

    if (action === "verify_transcript") {
      if (!studentId) {
        return NextResponse.json({ error: "studentId is required" }, { status: 400 });
      }
      const integrity = await verifyStudentTranscriptIntegrity(d1, admin.schoolId, studentId);
      return NextResponse.json(integrity);
    }

    if (action === "validate_activation") {
      const resolvedTermId = newTermId || (
        await d1
          .select({ id: terms.id })
          .from(terms)
          .where(and(eq(terms.schoolId, admin.schoolId), eq(terms.isCurrent, true)))
          .limit(1)
      )[0]?.id;

      if (!resolvedTermId) {
        return NextResponse.json({ error: "No term found for activation validation" }, { status: 400 });
      }

      const validation = await validateTermActivationSafety(d1, admin.schoolId, resolvedTermId);
      return NextResponse.json(validation);
    }

    if (action === "enrollment_history") {
      if (!studentId) {
        return NextResponse.json({ error: "studentId is required" }, { status: 400 });
      }
      const history = await getStudentEnrollmentHistory(d1, admin.schoolId, studentId);
      return NextResponse.json({ history, count: history.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Term history POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process term history request" },
      { status: 500 }
    );
  }
}
