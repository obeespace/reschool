import connectDB from "@/app/utils/db";
import Term from "@/app/models/Term";

/**
 * Checks if the current term is paid for and active
 * Returns term data if valid, throws error otherwise
 */
export async function checkTermAccess(schoolId: string, termId?: string) {
  await connectDB();

  // If termId provided, check that specific term. Otherwise check active term.
  let term;
  if (termId) {
    term = await Term.findOne({
      _id: termId,
      schoolId
    });
  } else {
    term = await Term.findOne({
      schoolId,
      isActive: true
    });
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
  await connectDB();
  return await Term.find({ schoolId, isPaid: true });
}

/**
 * Checks if operations are allowed (term must be active, paid, and not closed)
 */
export async function canPerformOperations(schoolId: string) {
  try {
    await checkTermAccess(schoolId);
    return true;
  } catch (error) {
    return false;
  }
}
