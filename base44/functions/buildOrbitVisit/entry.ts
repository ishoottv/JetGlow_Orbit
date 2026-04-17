import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const LABOR_ESTIMATES = {
  light: 0.5,
  moderate: 1.5,
  heavy: 3.0,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { aircraft_id } = body;
    if (!aircraft_id) return Response.json({ error: "aircraft_id required" }, { status: 400 });

    // Fetch aircraft and its service statuses
    const [aircraft, serviceStatuses, orbitPlan] = await Promise.all([
      base44.entities.Aircraft.get(aircraft_id),
      base44.entities.AircraftServiceStatus.filter({ aircraft_id }),
      aircraft.orbit_plan ? base44.entities.OrbitPlan.filter({ plan_name: aircraft.orbit_plan }).then(p => p[0]) : null,
    ]);

    if (!aircraft) return Response.json({ error: "Aircraft not found" }, { status: 404 });

    // Select candidate services: recommended_action != "none" OR always_evaluate OR included_by_default
    const candidates = serviceStatuses.filter(s =>
      (s.recommended_action && s.recommended_action !== "none") ||
      s.always_evaluate ||
      s.included_by_default
    );

    // Sort by priority
    const sortedServices = candidates.sort((a, b) => {
      // 1. recommended_action priority
      const actionPriority = {
        immediate_attention: 0,
        include_now: 1,
        recommend: 2,
        quote_add_on: 3,
        recommend_reset: 4,
        recommend_plan_upgrade: 5,
        none: 6,
      };
      const aPriority = actionPriority[a.recommended_action] ?? 6;
      const bPriority = actionPriority[b.recommended_action] ?? 6;
      if (aPriority !== bPriority) return aPriority - bPriority;

      // 2. trigger_priority (ascending)
      if ((a.trigger_priority || 100) !== (b.trigger_priority || 100)) {
        return (a.trigger_priority || 100) - (b.trigger_priority || 100);
      }

      // 3. service_trigger_score (descending)
      return (b.service_trigger_score || 0) - (a.service_trigger_score || 0);
    });

    // Initialize tracking
    let totalLaborHours = 0;
    let correctionServicesUsed = 0;
    const maxCorrectionServices = orbitPlan?.max_correction_controlled_services_per_visit || 2;

    const includedServices = [];
    const deferredServices = [];
    const upgradeRecommendations = [];

    // Process each service
    for (const service of sortedServices) {
      let isIncluded = false;
      let deferredReason = "none";

      // A. Check subscription rules
      const subscriptionType = service.subscription_scope_type;

      // Exception-upgrade services are never included by default
      if (subscriptionType === "exception_upgrade") {
        deferredReason = "plan_exclusion";
      }
      // Monthly and rotational included services are allowed if triggered
      else if (
        subscriptionType === "monthly_included" ||
        (subscriptionType === "rotational_included" && service.recommended_action !== "none")
      ) {
        isIncluded = true;
      }
      // Correction-controlled services have limits
      else if (subscriptionType === "correction_controlled") {
        if (correctionServicesUsed < maxCorrectionServices) {
          isIncluded = true;
          correctionServicesUsed++;
        } else {
          deferredReason = "correction_limit";
        }
      }
      // Services with no subscription restriction
      else if (subscriptionType === "rotational_included" && service.recommended_action !== "none") {
        isIncluded = true;
      } else if (!subscriptionType) {
        isIncluded = true;
      }

      // B. Check labor limits (if still included)
      if (isIncluded && service.max_labor_hours_per_visit) {
        const laborEstimate = service.effort_level
          ? LABOR_ESTIMATES[service.effort_level] || 1.0
          : 1.0;

        if (totalLaborHours + laborEstimate > (orbitPlan?.expected_hours_per_month || 50)) {
          isIncluded = false;
          deferredReason = "labor_limit";
        } else {
          totalLaborHours += laborEstimate;
        }
      } else if (isIncluded && service.effort_level) {
        const laborEstimate = LABOR_ESTIMATES[service.effort_level] || 1.0;
        totalLaborHours += laborEstimate;
      }

      // Update service status and defer tracking
      if (isIncluded) {
        includedServices.push({
          id: service.id,
          service_code: service.service_code,
          service_name: service.service_name,
          recommended_action: service.recommended_action,
          effort_level: service.effort_level,
          labor_estimate: service.effort_level ? LABOR_ESTIMATES[service.effort_level] || 1.0 : 0,
          visit_group: service.visit_group,
          trigger_score: service.service_trigger_score,
          status: service.service_status,
        });
      } else {
        deferredServices.push({
          id: service.id,
          service_code: service.service_code,
          service_name: service.service_name,
          recommended_action: service.recommended_action,
          deferred_reason: deferredReason,
          trigger_score: service.service_trigger_score,
        });
      }

      // Track upgrade recommendations
      if (service.exception_triggered && service.upgrade_recommendation_type) {
        upgradeRecommendations.push({
          service_code: service.service_code,
          service_name: service.service_name,
          recommendation_type: service.upgrade_recommendation_type,
          trigger_score: service.service_trigger_score,
          exception_threshold: service.exception_threshold,
        });
      }
    }

    // Update AircraftServiceStatus records with final inclusion decisions
    await Promise.all([
      ...includedServices.map(s =>
        base44.asServiceRole.entities.AircraftServiceStatus.update(s.id, {
          is_included_this_visit: true,
          deferred_reason: "none",
        })
      ),
      ...deferredServices.map(s =>
        base44.asServiceRole.entities.AircraftServiceStatus.update(s.id, {
          is_included_this_visit: false,
          deferred_reason: s.deferred_reason,
        })
      ),
    ]);

    // Build visit summary
    const visitSummary = {
      aircraft_id,
      aircraft: {
        tail_number: aircraft.tail_number,
        category: aircraft.aircraft_category,
        severity_profile: aircraft.severity_profile,
        orbit_plan: aircraft.orbit_plan,
      },
      visit_scope: {
        total_included_services: includedServices.length,
        total_deferred_services: deferredServices.length,
        estimated_labor_hours: parseFloat(totalLaborHours.toFixed(2)),
        correction_services_allocated: correctionServicesUsed,
      },
      included_services: includedServices,
      deferred_services: deferredServices,
      upgrade_recommendations: upgradeRecommendations,
      plan_limits: {
        max_correction_services: maxCorrectionServices,
        estimated_plan_hours: orbitPlan?.expected_hours_per_month || 50,
      },
      generated_at: new Date().toISOString(),
    };

    return Response.json(visitSummary);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});