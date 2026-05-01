// Feature flags — expand this map as features are gated by subscription tier
const ENABLED_FEATURES: Record<string, boolean> = {
  AI: false,
  REWARDS: true,
  BRANDING: false,
};

export async function hasFeature(
  schoolId: string,
  feature: "AI" | "REWARDS" | "BRANDING"
) {
  void schoolId; // future: check school's subscription tier from DB
  return ENABLED_FEATURES[feature] ?? false;
}
