type LifecycleEligibilityInput = {
  currentStatus?: string | null;
  certificationStatus?: string | null;
  graduationDate?: Date | number | null;
  withdrawalReason?: string | null;
};

export type CertificateEligibilityResult = {
  eligible: boolean;
  code: string;
  reason: string;
};

export function resolveCertificateEligibility(
  lifecycle: LifecycleEligibilityInput | null | undefined
): CertificateEligibilityResult {
  if (!lifecycle) {
    return {
      eligible: false,
      code: "NO_LIFECYCLE_RECORD",
      reason: "Student lifecycle record is required before certificate issuance.",
    };
  }

  const currentStatus = String(lifecycle.currentStatus || "").toUpperCase();
  const certificationStatus = String(lifecycle.certificationStatus || "").toUpperCase();

  if (currentStatus === "WITHDRAWN") {
    return {
      eligible: false,
      code: "WITHDRAWN_STUDENT",
      reason: "Withdrawn students are not eligible for graduation certificates.",
    };
  }

  if (currentStatus === "SUSPENDED") {
    return {
      eligible: false,
      code: "SUSPENDED_STUDENT",
      reason: "Suspended students cannot be issued certificates until their lifecycle status changes.",
    };
  }

  if (currentStatus === "GRADUATED") {
    return {
      eligible: true,
      code: "GRADUATED",
      reason: "Student has graduated and is eligible for certificate issuance.",
    };
  }

  if (certificationStatus === "READY" || certificationStatus === "IN_PROGRESS" || certificationStatus === "COMPLETED") {
    return {
      eligible: true,
      code: certificationStatus || "READY",
      reason: "Student lifecycle record is marked ready for certificate processing.",
    };
  }

  if (lifecycle.graduationDate) {
    return {
      eligible: true,
      code: "HAS_GRADUATION_DATE",
      reason: "Student has a graduation date recorded and is eligible for certificate issuance.",
    };
  }

  return {
    eligible: false,
    code: "NOT_READY",
    reason: "Student must be graduated or explicitly marked ready before certificate issuance.",
  };
}