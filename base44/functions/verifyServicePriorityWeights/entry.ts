import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Safeguard verification function: Audits all service rules to ensure
 * service_priority_weight is properly set. If missing, defaults to 25.
 * This prevents accidental ranking breakage.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const rules = await base44.asServiceRole.entities.ServiceTriggerRule.filter({ is_active: true });

    const audit = {
      total_rules: rules.length,
      with_weights: 0,
      missing_weights: 0,
      details: [],
    };

    for (const rule of rules) {
      const weight = rule.service_priority_weight ?? null;
      
      if (weight !== null && weight !== undefined) {
        audit.with_weights++;
        audit.details.push({
          service_code: rule.service_code,
          service_name: rule.service_name,
          weight: weight,
          status: "OK",
        });
      } else {
        audit.missing_weights++;
        audit.details.push({
          service_code: rule.service_code,
          service_name: rule.service_name,
          weight: null,
          status: "MISSING - Will default to 25 in status calculations",
        });
      }
    }

    return Response.json({
      success: true,
      audit,
      note: "Any rule with missing weight will fallback to 25 during calculateServiceTriggers",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});