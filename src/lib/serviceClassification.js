export function getNormalizedWorkClass(service) {
  return (service?.work_class || "monthly").toLowerCase();
}

export function isCoreMonthlyService(service) {
  const workClass = getNormalizedWorkClass(service);
  return (
    workClass === "monthly" ||
    service?.subscription_scope_type === "monthly_included" ||
    service?.included_by_default === true
  );
}

export function getServiceFrequencyBucket(service) {
  if (isCoreMonthlyService(service)) return "monthly";

  const workClass = getNormalizedWorkClass(service);
  if (workClass === "quarterly") return "quarterly";
  if (workClass === "semiannual") return "semiannual";
  if (workClass === "yearly") return "yearly";

  return "other";
}

export function getServiceClassificationDetails(service) {
  const workClass = getNormalizedWorkClass(service);
  const bucket = getServiceFrequencyBucket(service);
  const reasons = [];

  if (workClass === "monthly") reasons.push("work_class");
  if (service?.subscription_scope_type === "monthly_included") reasons.push("monthly_included");
  if (service?.included_by_default === true) reasons.push("included_by_default");

  const notes = [];
  if (bucket === "monthly" && workClass !== "monthly") {
    notes.push("Grouped as monthly because inclusion flags override the frequency label.");
  }
  if (bucket !== "monthly" && service?.service_category === "Monthly") {
    notes.push("Legacy service_category says Monthly, but current logic uses work_class and inclusion settings.");
  }
  if (bucket === "other") {
    notes.push("No supported frequency bucket matched this rule.");
  }

  return {
    bucket,
    workClass,
    reasons,
    notes,
  };
}
