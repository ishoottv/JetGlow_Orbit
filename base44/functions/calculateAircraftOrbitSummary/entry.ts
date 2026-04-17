import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Import aircraft orbit summary functions
// Note: In Deno, we need to inline these since local imports aren't supported
function summarizeAircraftOrbitStatus(serviceStatuses = []) {
  if (!Array.isArray(serviceStatuses) || serviceStatuses.length === 0) {
    return {
      orbit_status: "Green",
      worst_service_score: 0,
      worst_service_name: null,
      worst_service_due_by: null,
      worst_service_trigger_source: null,
      overdue_count: 0,
      due_soon_count: 0,
      healthy_count: 0,
      active_attention_count: 0,
    };
  }

  const validStatuses = serviceStatuses.filter(
    s => s.service_status !== "No Interval"
  );

  const redServices = validStatuses.filter(s => s.service_status === "Red");
  const amberServices = validStatuses.filter(s => s.service_status === "Amber");
  const greenServices = validStatuses.filter(s => s.service_status === "Green");

  const overdue_count = redServices.length;
  const due_soon_count = amberServices.length;
  const healthy_count = greenServices.length;
  const active_attention_count = overdue_count + due_soon_count;

  let orbit_status = "Green";
  if (redServices.length > 0) {
    orbit_status = "Red";
  } else if (amberServices.length > 0) {
    orbit_status = "Amber";
  }

  let worstService = null;
  let worst_service_score = 0;
  for (const status of serviceStatuses) {
    const score = status.service_trigger_score || 0;
    if (score > worst_service_score) {
      worst_service_score = score;
      worstService = status;
    }
  }

  return {
    orbit_status,
    worst_service_score: worst_service_score > 0 ? parseFloat(worst_service_score.toFixed(3)) : 0,
    worst_service_name: worstService?.service_name || null,
    worst_service_due_by: worstService?.due_by || null,
    worst_service_trigger_source: worstService?.trigger_source || null,
    overdue_count,
    due_soon_count,
    healthy_count,
    active_attention_count,
  };
}

function daysSinceOrbit(baselineDate) {
  if (!baselineDate) return 0;

  const baseline = new Date(baselineDate);
  const today = new Date();

  const baselineTime = new Date(baseline.getFullYear(), baseline.getMonth(), baseline.getDate());
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diff = todayTime - baselineTime;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return Math.max(0, days);
}

function calculateAircraftOrbitScore(worstServiceScore = 0, lastOrbitBaselineDate = null) {
  const sanitizedScore = Math.max(0, parseFloat(worstServiceScore) || 0);
  
  // Use standardized day calculation
  const days_since_orbit = daysSinceOrbit(lastOrbitBaselineDate);
  const withinProtection = days_since_orbit < 30;

  let orbit_score;
  let condition_index;

  if (withinProtection) {
    // Within 30-day window: force aircraft score to 0 and condition to 100 (protection overrides all)
    orbit_score = 0;
    condition_index = 100;
  } else {
    // After 30 days: normal calculation from worst service score
    orbit_score = Math.min(sanitizedScore * 100, 100);
    orbit_score = Math.round(orbit_score);
    condition_index = 100 - orbit_score;
  }

  return {
    orbit_score,
    condition_index,
    days_since_orbit,
    within_protection_window: withinProtection,
  };
}

function getClientConditionPresentation(orbitStatus = "Green") {
  const labelMap = {
    Green: "In Good Standing",
    Amber: "Due Soon",
    Red: "Action Recommended",
  };

  const messageMap = {
    Green: "Your aircraft is currently in good standing within the JetGlow ORBIT condition program.",
    Amber: "One or more service items are approaching attention thresholds. Review is recommended soon.",
    Red: "One or more service items have exceeded service thresholds. Attention is recommended.",
  };

  const status = orbitStatus || "Green";

  return {
    client_condition_label: labelMap[status] || labelMap.Green,
    client_condition_message: messageMap[status] || messageMap.Green,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { aircraft_id } = body;

    // Fetch aircraft list
    const aircraftList = aircraft_id
      ? await base44.asServiceRole.entities.Aircraft.get(aircraft_id).then(a => [a])
      : await base44.asServiceRole.entities.Aircraft.list();

    if (!aircraftList || aircraftList.length === 0) {
      return Response.json({ success: true, processed: 0 });
    }

    // Fetch all service statuses
    const allServiceStatuses = aircraft_id
      ? await base44.asServiceRole.entities.AircraftServiceStatus.filter({ aircraft_id })
      : await base44.asServiceRole.entities.AircraftServiceStatus.list();

    // Group service statuses by aircraft
    const statusesByAircraft = {};
    for (const status of allServiceStatuses) {
      if (!statusesByAircraft[status.aircraft_id]) {
        statusesByAircraft[status.aircraft_id] = [];
      }
      statusesByAircraft[status.aircraft_id].push(status);
    }

    let processed = 0;

    // Process each aircraft sequentially to avoid rate limits
    for (const aircraft of aircraftList.filter(Boolean)) {
      const serviceStatuses = statusesByAircraft[aircraft.id] || [];

      // Calculate aircraft-level summary
      const summary = summarizeAircraftOrbitStatus(serviceStatuses);

      // Calculate aircraft-level score
      const scoreData = calculateAircraftOrbitScore(
        summary.worst_service_score,
        aircraft.last_orbit_baseline_date
      );

      // Get client-facing presentation
      const clientPresentation = getClientConditionPresentation(summary.orbit_status);

      // Combine all aircraft-level data
      const aircraftData = {
        orbit_status: summary.orbit_status,
        orbit_score: scoreData.orbit_score,
        condition_index: scoreData.condition_index,
        worst_service_score: summary.worst_service_score,
        worst_service_name: summary.worst_service_name,
        worst_service_due_by: summary.worst_service_due_by,
        worst_service_trigger_source: summary.worst_service_trigger_source,
        overdue_count: summary.overdue_count,
        due_soon_count: summary.due_soon_count,
        healthy_count: summary.healthy_count,
        active_attention_count: summary.active_attention_count,
        client_condition_label: clientPresentation.client_condition_label,
        client_condition_message: clientPresentation.client_condition_message,
        last_orbit_summary_at: new Date().toISOString(),
      };

      // Update aircraft record
      await base44.asServiceRole.entities.Aircraft.update(aircraft.id, aircraftData);
      processed++;

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 150));
    }

    return Response.json({ success: true, processed, aircraft: aircraftList.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});