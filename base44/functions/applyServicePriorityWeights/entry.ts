import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PRIORITY_WEIGHTS = {
  // 100 – Critical preservation services
  100: [
    "BRIGHT_FULL",
    "CERAMIC_COATING",
    "PAINT_CORRECTION",
    "DECONTAMINATION"
  ],
  // 80 – Core condition services
  80: [
    "EXTERIOR_WASH",
    "EXT_DRY_WASH",
    "INTERIOR_DEEP_CLEAN",
    "LEATHER_CLEAN",
    "CARPET_EXTRACTION",
    "GEAR_WELLS"
  ],
  // 50 – Standard condition
  50: [
    "INTERIOR_WIPE",
    "CARPET_VAC",
    "WINDOWS_GLASS"
  ],
  // 25 – Routine services
  25: [
    "CABIN_DOOR",
    "LAV_CLEAN",
    "SPOT_CLEANING",
    "BRIGHT_TOUCH",
    "EXHAUST_CLEAN",
    "SPOT_DECON",
    "BELLY_CLEAN",
    "LEADING_EDGE",
    "ONE_STEP_POLISH",
    "CERAMIC_BOOST"
  ],
  // 10 – Cosmetic / minor services
  10: [
    "COSMETIC_DETAIL"
  ]
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch all active service rules
    const rules = await base44.asServiceRole.entities.ServiceTriggerRule.filter({ is_active: true });

    const updates = [];

    for (const rule of rules) {
      let targetWeight = 25; // Default
      
      // Find which weight category this service belongs to
      for (const [weight, codes] of Object.entries(PRIORITY_WEIGHTS)) {
        if (codes.includes(rule.service_code)) {
          targetWeight = parseInt(weight);
          break;
        }
      }

      // Update the rule if weight changed
      if ((rule.service_priority_weight || 100) !== targetWeight) {
        await base44.asServiceRole.entities.ServiceTriggerRule.update(rule.id, {
          service_priority_weight: targetWeight
        });
        
        updates.push({
          service_code: rule.service_code,
          service_name: rule.service_name,
          old_weight: rule.service_priority_weight || 100,
          new_weight: targetWeight,
          status: "updated"
        });
      } else {
        updates.push({
          service_code: rule.service_code,
          service_name: rule.service_name,
          weight: targetWeight,
          status: "unchanged"
        });
      }
    }

    const updated = updates.filter(u => u.status === "updated");
    const unchanged = updates.filter(u => u.status === "unchanged");

    return Response.json({
      success: true,
      total_rules: rules.length,
      updated_count: updated.length,
      unchanged_count: unchanged.length,
      updated_details: updated,
      unchanged_summary: `${unchanged.length} services already had correct weight or defaulted to 25`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});