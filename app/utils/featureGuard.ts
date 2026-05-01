import Subscription from "@/app/models/Subscription";

export async function hasFeature(
  schoolId: string,
  feature: "AI" | "REWARDS" | "BRANDING"
) {
  const sub = await Subscription.findOne({
    schoolId,
    status: "ACTIVE"
  });

  if (!sub) return false;

  if (sub.plan === "ENTERPRISE") return true;
  if (sub.plan === "PRO" && feature !== "BRANDING") return true;

  return false;
}
