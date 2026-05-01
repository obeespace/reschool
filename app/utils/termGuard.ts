import { getOptionalD1Client } from "@/app/db/runtime";
import { terms } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Checks if the current term is paid for and active
 * Returns term data if valid, throws error otherwise
 */
export async function checkTermAccess(schoolId: string, termId?: string) {
  const d1 = getOptionalD1Client();
  if (!d1) {
    throw new Error("D1 database not configured");
  }

  // If termId provided, check that specific term. Otherwise check active term.
  let term;
  if (termId) {
    const rows = await d1
      .select()
      .from(terms)
      .where(and(eq(terms.id, termId), eq(terms.schoolId, schoolId)))
      .limit(1);
    term = rows[0] || null;
  } else {
    const rows = await d1
      .select()
      .from(terms)
      .where(and(eq(terms.schoolId, schoolId), eq(terms.isCurrent, true)))
      .limit(1);
    term = rows[0] || null;
  }

  if (!term) {
    throw new Error("Term not found. Please contact your administrator.");
  }

  if (!term.isPaid) {
    throw new Error("Access denied. Payment required for this term.");
  }

  if (term.isClosed) {
    throw new Error("This term is closed. No edits are allowed.");
  }

  return term;
}

/**
 * Checks if a specific term is accessible (paid for)
 */
export async function checkSpecificTermAccess(schoolId: string, termId: string) {
  return await checkTermAccess(schoolId, termId);
}

/**
 * Gets all paid terms for a school (for historical data access)
 */
export async function getPaidTerms(schoolId: string) {
  const d1 = getOptionalD1Client();
  if (!d1) {
    throw new Error("D1 database not configured");
  }
  return await d1.select().from(terms).where(and(eq(terms.schoolId, schoolId), eq(terms.isPaid, true)));
}

/**
 * Checks if operations are allowed (term must be active, paid, and not closed)
 */
export async function canPerformOperations(schoolId: string) {
  try {
    await checkTermAccess(schoolId);
    return true;
  } catch {
    return false;
  }
}
