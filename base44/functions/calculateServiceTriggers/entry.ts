import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const VISIT_EVALUATED_SERVICES = new Set([
  "BELLY_CLEAN",
  "LEADING_EDGE_CLEAN",
  "SPOT_DECON",
]);

function getEffortLevel(score) {
  if (score >= 1.0) return "heavy";
  if (score >= 0.6) return "moderate";
  return "light";
}

const SEVERITY_MULTIPLIERS = {
  "Light use": 1.1,
  "Moderate use": 1.0,
  "Heavy use": 0.85,
  "Charter / high turn": 0.7,
  "Harsh environment": 0.8,
};

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const diff = new Date() - new Date(dateStr);
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function applyMultiplier(interval, severityProfile) {
  if (!interval || interval <= 0) return null;
  const mult = SEVERITY_MULTIPLIERS[severityProfile] || 1.0;
  return interval * mult;
}

function isValidInterval(value) {
  return typeof value === "number" && value > 0 && isFinite(value);
}

function sanitizeNumber(value, defaultValue = 0) {
  const num = parseFloat(value);
  return isFinite(num) && num >= 0 ? num : defaultValue;
}

function deriveOverrideTrackingType(triggerOverride) {
  if (!triggerOverride || triggerOverride.use_aircraft_tracking_default) return null;

  const selected = [
    triggerOverride.service_track_days ? "days" : null,
    triggerOverride.service_track_hours ? "hours" : null,
    triggerOverride.service_track_cycles ? "cycles" : null,
  ].filter(Boolean);

  // The business rule is a single driver per service. If exactly one override driver
  // is selected, treat it as the authoritative tracking type for this aircraft/service.
  return selected.length === 1 ? selected[0] : null;
}

// ===== CENTRALIZED TRIGGER CALCULATION ENGINE =====
// This is the ONLY place orbit_service_status is calculated across the entire app
function calculateServiceTrigger(
  daysSince,
  hoursSince,
  cyclesSince,
  effectiveDayInterval,
  effectiveHourInterval,
  effectiveCycleInterval,
  trackingConfig = null,
  trackingType = null // "hours" | "cycles" | "days" — if set, ONLY use this dimension
) {
  const sanitizedDays = sanitizeNumber(daysSince, 0);
  const sanitizedHours = sanitizeNumber(hoursSince, 0);
  const sanitizedCycles = sanitizeNumber(cyclesSince, 0);

  const progressions = [];

  if (trackingType === "hours" || trackingType === "cycles" || trackingType === "days") {
    // Strict single-dimension mode: use only the selected tracking type
    if (trackingType === "days") {
      const score = isValidInterval(effectiveDayInterval) ? sanitizedDays / effectiveDayInterval : null;
      if (score !== null) progressions.push({ score, source: "days" });
    } else if (trackingType === "hours") {
      const score = isValidInterval(effectiveHourInterval) ? sanitizedHours / effectiveHourInterval : null;
      if (score !== null) progressions.push({ score, source: "hours" });
    } else if (trackingType === "cycles") {
      const score = isValidInterval(effectiveCycleInterval) ? sanitizedCycles / effectiveCycleInterval : null;
      if (score !== null) progressions.push({ score, source: "cycles" });
    }
  } else {
    // Legacy mode: use aircraft tracking config flags (multi-dimension max)
    const trackHours = trackingConfig?.track_hours ?? true;
    const trackCycles = trackingConfig?.track_cycles ?? false;
    const trackDays = trackingConfig?.track_days ?? true;

    if (trackDays) {
      const score = isValidInterval(effectiveDayInterval) ? sanitizedDays / effectiveDayInterval : null;
      if (score !== null) progressions.push({ score, source: "days" });
    }
    if (trackHours) {
      const score = isValidInterval(effectiveHourInterval) ? sanitizedHours / effectiveHourInterval : null;
      if (score !== null) progressions.push({ score, source: "hours" });
    }
    if (trackCycles) {
      const score = isValidInterval(effectiveCycleInterval) ? sanitizedCycles / effectiveCycleInterval : null;
      if (score !== null) progressions.push({ score, source: "cycles" });
    }
  }

  // No valid intervals — service has no triggering condition
  if (progressions.length === 0) {
    return {
      service_trigger_score: 0,
      orbit_service_status: "No Interval",
      service_due: false,
      service_overdue: false,
      due_by: null,
      trigger_source: null,
    };
  }

  // Find worst (highest) score
  const worst = progressions.reduce((prev, curr) => curr.score > prev.score ? curr : prev);
  const triggerScore = worst.score;

  // Fixed thresholds — DO NOT CHANGE
  let status;
  if (triggerScore >= 1.0) {
    status = "Red";
  } else if (triggerScore >= 0.8) {
    status = "Amber";
  } else {
    status = "Green";
  }

  return {
    service_trigger_score: parseFloat(triggerScore.toFixed(3)),
    orbit_service_status: status,
    service_due: triggerScore >= 1.0,
    service_overdue: triggerScore > 1.0,
    due_by: worst.source,
    trigger_source: worst.source,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { aircraft_id, maintenance_event_id } = body;

    // If triggered by a maintenance event automation, check if it's a RESET — skip re-scoring if so
    if (maintenance_event_id) {
      const evt = await base44.asServiceRole.entities.MaintenanceEvent.get(maintenance_event_id).catch(() => null);
      if (evt?.service_type === "RESET") {
        return Response.json({ success: true, skipped: true, reason: "RESET event — scoring skipped" });
      }
    }

    // Batch-fetch everything upfront in parallel
    const [rules, aircraftList, allServiceLogs, allStatuses, allConditionOverrides, allTriggerOverrides, allMaintenanceEvents] = await Promise.all([
      base44.asServiceRole.entities.ServiceTriggerRule.filter({ is_active: true }),
      aircraft_id
        ? base44.asServiceRole.entities.Aircraft.get(aircraft_id).then(a => [a])
        : base44.asServiceRole.entities.Aircraft.list(),
      aircraft_id
        ? base44.asServiceRole.entities.ServiceLog.filter({ aircraft_id })
        : base44.asServiceRole.entities.ServiceLog.list(),
      aircraft_id
        ? base44.asServiceRole.entities.AircraftServiceStatus.filter({ aircraft_id })
        : base44.asServiceRole.entities.AircraftServiceStatus.list(),
      aircraft_id
        ? base44.asServiceRole.entities.ConditionOverride.filter({ aircraft_id })
        : base44.asServiceRole.entities.ConditionOverride.list(),
      aircraft_id
        ? base44.asServiceRole.entities.AircraftServiceTriggerOverride.filter({ aircraft_id })
        : base44.asServiceRole.entities.AircraftServiceTriggerOverride.list(),
      aircraft_id
        ? base44.asServiceRole.entities.MaintenanceEvent.filter({ aircraft_id })
        : base44.asServiceRole.entities.MaintenanceEvent.list(),
    ]);

    // Build lookup maps
    const logMap = {};
    for (const log of allServiceLogs) {
      const key = `${log.aircraft_id}:${log.service_code}`;
      if (!logMap[key] || log.service_date > logMap[key].service_date) {
        logMap[key] = log;
      }
    }

    // Also check MaintenanceEvent records for services not yet in ServiceLog
    for (const event of allMaintenanceEvents) {
      if (!event.services_performed || !Array.isArray(event.services_performed)) continue;
      for (const serviceCode of event.services_performed) {
        const key = `${event.aircraft_id}:${serviceCode}`;
        if (!logMap[key]) {
          logMap[key] = {
            aircraft_id: event.aircraft_id,
            service_code: serviceCode,
            service_date: event.service_date,
            total_hours_at_service: event.total_hours_at_service || 0,
            total_cycles_at_service: event.total_cycles_at_service || 0,
            technician_name: event.technician_name || "",
            notes: event.work_performed || "",
          };
        } else if (event.service_date > logMap[key].service_date) {
          logMap[key] = {
            aircraft_id: event.aircraft_id,
            service_code: serviceCode,
            service_date: event.service_date,
            total_hours_at_service: event.total_hours_at_service || 0,
            total_cycles_at_service: event.total_cycles_at_service || 0,
            technician_name: event.technician_name || "",
            notes: event.work_performed || "",
          };
        }
      }
    }

    const statusMap = {};
    for (const s of allStatuses) {
      statusMap[`${s.aircraft_id}:${s.service_code}`] = s;
    }

    const conditionOverrideMap = {};
    for (const o of allConditionOverrides) {
      conditionOverrideMap[`${o.aircraft_id}:${o.service_name}`] = o;
    }

    const triggerOverrideMap = {};
    for (const o of allTriggerOverrides) {
      triggerOverrideMap[`${o.aircraft_id}:${o.service_code}`] = o;
    }

    const allFlights = aircraft_id
      ? await base44.asServiceRole.entities.Flight.filter({ aircraft_id, count_toward_orbit: true })
      : await base44.asServiceRole.entities.Flight.filter({ count_toward_orbit: true });

    const flightsByAircraft = {};
    for (const f of allFlights) {
      if (f.flight_status === "cancelled") continue;
      if (!flightsByAircraft[f.aircraft_id]) flightsByAircraft[f.aircraft_id] = [];
      flightsByAircraft[f.aircraft_id].push(f);
    }

    let processed = 0;

    // Process each aircraft sequentially to avoid rate limits
    for (const aircraft of aircraftList.filter(Boolean)) {
      const validFlights = flightsByAircraft[aircraft.id] || [];

      for (const rule of rules) {
        const applies =
          rule.applies_to_aircraft_master_id === aircraft.id ||
          rule.applies_to_category === "All" ||
          rule.applies_to_category === aircraft.aircraft_category;
        if (!applies) continue;

        const triggerOverride = triggerOverrideMap[`${aircraft.id}:${rule.service_code}`];
        const serviceEnabled = triggerOverride?.service_enabled ?? true;
        const existing = statusMap[`${aircraft.id}:${rule.service_code}`];

        if (!serviceEnabled) {
          if (existing) {
            await base44.asServiceRole.entities.AircraftServiceStatus.delete(existing.id);
            delete statusMap[`${aircraft.id}:${rule.service_code}`];
          }
          continue;
        }
        
        // Determine tracking settings: service override > aircraft default
        let serviceTrackHours = aircraft.track_hours ?? true;
        let serviceTrackCycles = aircraft.track_cycles ?? false;
        let serviceTrackDays = aircraft.track_days ?? true;
        let trackingSource = "aircraft_default";
        
        if (triggerOverride && !triggerOverride.use_aircraft_tracking_default) {
          serviceTrackHours = triggerOverride.service_track_hours ?? true;
          serviceTrackCycles = triggerOverride.service_track_cycles ?? false;
          serviceTrackDays = triggerOverride.service_track_days ?? true;
          trackingSource = "service_override";
        }

        const intervals = triggerOverride ? {
          day_interval: triggerOverride.day_interval,
          hour_interval: triggerOverride.hour_interval,
          cycle_interval: triggerOverride.cycle_interval,
        } : {
          day_interval: rule.day_interval,
          hour_interval: rule.hour_interval,
          cycle_interval: rule.cycle_interval,
        };

        const appliedIntervals = {
          day_interval: applyMultiplier(intervals.day_interval, aircraft.severity_profile),
          hour_interval: applyMultiplier(intervals.hour_interval, aircraft.severity_profile),
          cycle_interval: applyMultiplier(intervals.cycle_interval, aircraft.severity_profile),
        };

        const lastService = logMap[`${aircraft.id}:${rule.service_code}`];
        const lastServiceDate = lastService?.service_date || aircraft.last_orbit_service_date || null;

        const daysSinceService = daysSince(lastServiceDate);
        const lastServiceDateObj = lastServiceDate ? new Date(lastServiceDate) : null;
        const flightsSinceService = lastServiceDateObj
          ? validFlights.filter(f => new Date(f.flight_date) > lastServiceDateObj)
          : validFlights;
        const hoursSinceService = flightsSinceService.reduce((s, f) => s + (f.block_hours || 0), 0);
        const cyclesSinceService = flightsSinceService.reduce((s, f) => s + (f.flight_cycle || 0), 0);

        // Create tracking config object for this service
        const serviceTrackingConfig = {
          track_hours: serviceTrackHours,
          track_cycles: serviceTrackCycles,
          track_days: serviceTrackDays,
        };

        // Resolve effective tracking type: aircraft/service override wins if it selects a
        // single driver; otherwise fall back to the rule's canonical tracking type.
        const overrideTrackingType = deriveOverrideTrackingType(triggerOverride);
        const effectiveTrackingType = overrideTrackingType || rule.tracking_type || null;

        // ===== CALL THE CENTRALIZED TRIGGER CALCULATION ENGINE =====
        const triggerResult = calculateServiceTrigger(
          daysSinceService,
          hoursSinceService,
          cyclesSinceService,
          appliedIntervals.day_interval,
          appliedIntervals.hour_interval,
          appliedIntervals.cycle_interval,
          serviceTrackingConfig,
          effectiveTrackingType
        );

        // Extract results from trigger engine
        const serviceScore = triggerResult.service_trigger_score;
        let status = triggerResult.orbit_service_status;

        // ===== INACTIVE AIRCRAFT RULE =====
        // If the aircraft has accumulated ZERO flight hours in the past 30 days,
        // it is considered inactive/parked and should remain in Good condition.
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentFlights = validFlights.filter(f => new Date(f.flight_date) >= thirtyDaysAgo);
        const hoursLast30Days = recentFlights.reduce((s, f) => s + (f.block_hours || 0), 0);
        if (hoursLast30Days === 0 && status !== "No Interval") {
          status = "Green";
          triggerResult.orbit_service_status = "Green";
          triggerResult.service_due = false;
          triggerResult.service_overdue = false;
        }

        const isVisitEvaluated = VISIT_EVALUATED_SERVICES.has(rule.service_code);
        const hasAnyUsage = hoursSinceService > 0 || cyclesSinceService > 0 || daysSinceService > 0;
        const effortLevel = isVisitEvaluated ? getEffortLevel(serviceScore) : null;
        let recommendedThisVisit = isVisitEvaluated ? hasAnyUsage : (status === "Amber" || status === "Red");

        // Apply condition overrides
        const conditionOverride = conditionOverrideMap[`${aircraft.id}:${rule.service_name}`];
        let overrideStatus = "none";
        let overrideReason = null;
        if (conditionOverride) {
          overrideStatus = conditionOverride.override_status;
          overrideReason = conditionOverride.reason;
          if (conditionOverride.override_status === "due_now") {
            status = "Red";
            triggerResult.orbit_service_status = "Red";
            triggerResult.service_due = true;
            triggerResult.service_overdue = true;
            recommendedThisVisit = true;
          } else if (conditionOverride.override_status === "due_soon" && status !== "Red") {
            status = "Amber";
            triggerResult.orbit_service_status = "Amber";
            triggerResult.service_due = false;
            triggerResult.service_overdue = false;
            recommendedThisVisit = true;
          }
        }

        let conditionDriver = triggerResult.due_by || "none";
        if (overrideStatus !== "none") { conditionDriver = "override"; }

        let recommendedReason = null;
        if (overrideStatus !== "none") {
          recommendedReason = "condition_override";
        } else if (status === "Red") {
          recommendedReason = "due_now";
        } else if (status === "Amber") {
          recommendedReason = "due_soon";
        } else if (rule.always_evaluate) {
          recommendedReason = "always_evaluate";
        } else if (rule.included_by_default) {
          recommendedReason = "included_by_default";
        } else if (isVisitEvaluated && hasAnyUsage) {
          recommendedReason = "visit_evaluated_with_usage";
        }

        let triggerSource = "rule";
        if (triggerOverride) triggerSource = "aircraft_override";
        if (conditionOverride) triggerSource = "condition_override";

        let exceptionTriggered = false;
        if (rule.exception_threshold && serviceScore >= rule.exception_threshold) {
          exceptionTriggered = true;
        }

        const severityMultipliers = {
          "Light use": rule.severity_light_multiplier || 1.1,
          "Moderate use": rule.severity_moderate_multiplier || 1.0,
          "Heavy use": rule.severity_heavy_multiplier || 0.85,
          "Charter / high turn": rule.severity_charter_multiplier || 0.7,
          "Harsh environment": rule.severity_harsh_environment_multiplier || 0.6,
        };
        const appliedSeverityMultiplier = severityMultipliers[aircraft.severity_profile] || 1.0;

        // Trigger Action Layer
        let recommendedAction = "none";
        const dueSoonThresholdValue = (triggerOverride?.due_soon_percent || rule.due_soon_percent || 80) / 100;

        // One-Step Polish: recommend only when within 14 days of due date
        if (rule.service_code === "ONE_STEP_POLISH") {
          const daysRem = isValidInterval(appliedIntervals.day_interval) ? appliedIntervals.day_interval - daysSinceService : null;
          if (serviceScore >= 1.0) {
            recommendedAction = "immediate_attention";
          } else if (daysRem !== null && daysRem <= 14) {
            recommendedAction = "recommend";
          }
        } else if (exceptionTriggered && rule.upgrade_recommendation_type) {
          recommendedAction = rule.upgrade_recommendation_type;
        } else if (rule.subscription_scope_type === "exception_upgrade") {
          if (serviceScore >= 1.0) {
            recommendedAction = "quote_add_on";
          } else if (serviceScore >= dueSoonThresholdValue) {
            recommendedAction = "recommend";
          }
        } else {
          if (serviceScore < dueSoonThresholdValue) {
            recommendedAction = "none";
          } else if (serviceScore < 1.0) {
            recommendedAction = "recommend";
          } else if (serviceScore < 1.25) {
            recommendedAction = "include_now";
          } else {
            recommendedAction = "immediate_attention";
          }
        }

        let isIncludedThisVisit = false;
        let deferredReason = "none";

        if (recommendedAction === "include_now" || rule.always_evaluate) {
          isIncludedThisVisit = true;
        } else if (rule.included_by_default) {
          isIncludedThisVisit = true;
        }

        if ((recommendedAction === "include_now" || recommendedAction === "immediate_attention") && !isIncludedThisVisit) {
          if (rule.max_labor_hours_per_visit) {
            deferredReason = "labor_limit";
          } else if (rule.subscription_scope_type === "correction_controlled") {
            deferredReason = "correction_limit";
          } else if (rule.subscription_scope_type === "exception_upgrade") {
            deferredReason = "plan_exclusion";
          } else {
            deferredReason = "manager_override";
          }
        }

        const statusRecord = {
          aircraft_id: aircraft.id,
          service_name: rule.service_name,
          service_code: rule.service_code,
          last_service_date: lastServiceDate,
          last_service_total_hours: lastService?.total_hours_at_service || (aircraft.last_orbit_total_hours || 0),
          last_service_total_cycles: lastService?.total_cycles_at_service || (aircraft.last_orbit_total_cycles || 0),
          days_since_last_service: daysSinceService,
          hours_since_last_service: parseFloat(hoursSinceService.toFixed(2)),
          cycles_since_last_service: cyclesSinceService,
          applicable_day_interval: appliedIntervals.day_interval || null,
          applicable_hour_interval: appliedIntervals.hour_interval || null,
          applicable_cycle_interval: appliedIntervals.cycle_interval || null,
          days_remaining: isValidInterval(appliedIntervals.day_interval) ? Math.max(0, appliedIntervals.day_interval - daysSinceService) : null,
          hours_remaining: isValidInterval(appliedIntervals.hour_interval) ? Math.max(0, appliedIntervals.hour_interval - hoursSinceService) : null,
          cycles_remaining: isValidInterval(appliedIntervals.cycle_interval) ? Math.max(0, appliedIntervals.cycle_interval - cyclesSinceService) : null,
          due_by_days: isValidInterval(appliedIntervals.day_interval) ? daysSinceService / appliedIntervals.day_interval : 0,
          due_by_hours: isValidInterval(appliedIntervals.hour_interval) ? hoursSinceService / appliedIntervals.hour_interval : 0,
          due_by_cycles: isValidInterval(appliedIntervals.cycle_interval) ? cyclesSinceService / appliedIntervals.cycle_interval : 0,
          // Persist the post-adjustment status so aircraft-level rollups see the same truth.
          service_trigger_score: triggerResult.service_trigger_score,
          service_status: status,
          service_due: triggerResult.service_due,
          service_overdue: triggerResult.service_overdue,
          due_by: triggerResult.due_by,
          trigger_source: triggerResult.trigger_source,
          recommended_this_visit: recommendedThisVisit,
          effort_level: effortLevel,
          condition_override_status: overrideStatus,
          override_reason: overrideReason,
          work_class: rule.work_class || "monthly",
          visit_group: rule.visit_group,
          subscription_scope_type: rule.subscription_scope_type,
          always_evaluate: rule.always_evaluate || false,
          included_by_default: rule.included_by_default || false,
          effort_mode: rule.effort_mode || "fixed",
          max_labor_hours_per_visit: rule.max_labor_hours_per_visit,
          condition_weight: rule.condition_weight || 10,
          service_priority_weight: rule.service_priority_weight ?? 25,
          trigger_priority: rule.trigger_priority || 100,
          exception_threshold: rule.exception_threshold,
          upgrade_recommendation_type: rule.upgrade_recommendation_type,
          due_soon_percent_applied: (triggerOverride?.due_soon_percent || rule.due_soon_percent || 80),
          severity_profile_applied: aircraft.severity_profile,
          severity_multiplier_applied: appliedSeverityMultiplier,
          recommended_reason: recommendedReason,
          exception_triggered: exceptionTriggered,
          condition_driver: conditionDriver,
          last_calculated_at: new Date().toISOString(),
          recommended_action: recommendedAction,
          is_included_this_visit: isIncludedThisVisit,
          deferred_reason: deferredReason,
          tracking_mode_applied: aircraft.tracking_mode || "hours_days",
          track_hours_applied: serviceTrackHours,
          track_cycles_applied: serviceTrackCycles,
          track_days_applied: serviceTrackDays,
          tracking_source: trackingSource,
        };

        if (existing) {
          await base44.asServiceRole.entities.AircraftServiceStatus.update(existing.id, statusRecord);
        } else {
          await base44.asServiceRole.entities.AircraftServiceStatus.create(statusRecord);
        }

        processed++;
        // Small delay to avoid hitting rate limits
        await new Promise(r => setTimeout(r, 100));
      }
    }

    return Response.json({ success: true, processed, aircraft: aircraftList.length, rules: rules.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
