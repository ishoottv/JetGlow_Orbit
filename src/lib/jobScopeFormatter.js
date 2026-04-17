import { isCoreMonthlyService, getNormalizedWorkClass } from "@/lib/serviceClassification";

export function generateJobScope(aircraft, serviceStatuses = [], rules = []) {
  const tail = aircraft.tail_number || "N/A";
  const type = aircraft.aircraft_category || "Unknown";
  const status = aircraft.orbit_status || "Green";
  
  // Build rule lookup by service code
  const ruleMap = {};
  for (const rule of rules) {
    ruleMap[rule.service_code] = rule;
  }

  // Enrich statuses with rule data
  const enriched = serviceStatuses.map(s => ({
    ...s,
    work_class: s.work_class || ruleMap[s.service_code]?.work_class,
    service_category: s.service_category || ruleMap[s.service_code]?.service_category,
    subscription_scope_type: s.subscription_scope_type || ruleMap[s.service_code]?.subscription_scope_type,
    included_by_default: s.included_by_default ?? ruleMap[s.service_code]?.included_by_default ?? false,
  }));

  // Get top drivers (Red/Amber services causing the status)
  const topDrivers = enriched
    .filter(s => s.service_status === "Red" || s.service_status === "Amber")
    .sort((a, b) => (b.service_trigger_score || 0) - (a.service_trigger_score || 0))
    .slice(0, 3)
    .map(s => s.service_name);

  // Group services by status (Red/Amber = due, regardless of recommended_this_visit)
  const baseServices = enriched.filter(s => isCoreMonthlyService(s) && (s.service_status === "Red" || s.service_status === "Amber"));
  const rotationalServices = enriched.filter(s => getNormalizedWorkClass(s) !== "monthly" && (s.service_status === "Red" || s.service_status === "Amber"));
  const correctionServices = enriched.filter(s => 
    (s.subscription_scope_type === "correction_controlled" || s.subscription_scope_type === "exception_upgrade") && (s.service_status === "Red" || s.service_status === "Amber")
  );

  let scope = `ORBIT JOB SCOPE
================================================================================

AIRCRAFT: ${tail} (${type})
STATUS: ${status}
DATE: ${new Date().toLocaleDateString()}

`;

  if (topDrivers.length > 0) {
    scope += `PRIMARY FOCUS:
${topDrivers.map(d => `• ${d}`).join("\n")}

`;
  }

  if (baseServices.length > 0) {
    scope += `BASE SERVICES (Always Included):
${baseServices.map(s => `• ${s.service_name}`).join("\n")}

`;
  }

  if (rotationalServices.length > 0) {
    scope += `ROTATIONAL SERVICES (Due This Visit):
${rotationalServices.map(s => {
      let line = `• ${s.service_name}`;
      if (s.effort_level) {
        const effortMap = { light: "(Light)", moderate: "(Moderate)", heavy: "(Heavy)" };
        line += ` ${effortMap[s.effort_level] || ""}`;
      }
      return line;
    }).join("\n")}

`;
  }

  if (correctionServices.length > 0) {
    scope += `CORRECTION WORK (Limited Scope):
${correctionServices.map(s => `• ${s.service_name}`).join("\n")}
Note: Correction services are limited per visit. Scope any additional work as Add-Ons.

`;
  }

  scope += `================================================================================
Auto-generated ORBIT scope — manually review before job entry.`;

  return scope;
}
