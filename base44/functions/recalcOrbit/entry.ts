import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Derives aircraft ORBIT status and score from the worst-performing service status.
// No longer depends on OrbitRule entity.

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

  let worstService = null;
  let worstServiceScore = 0;
  for (const status of serviceStatuses) {
    const score = status.service_trigger_score || 0;
    if (score > worstServiceScore) {
      worstServiceScore = score;
      worstService = status;
    }
  }

  return {
    orbit_status: redServices.length > 0 ? "Red" : amberServices.length > 0 ? "Amber" : "Green",
    worst_service_score: worstServiceScore > 0 ? parseFloat(worstServiceScore.toFixed(3)) : 0,
    worst_service_name: worstService?.service_name || null,
    worst_service_due_by: worstService?.due_by || null,
    worst_service_trigger_source: worstService?.trigger_source || null,
    overdue_count: redServices.length,
    due_soon_count: amberServices.length,
    healthy_count: greenServices.length,
    active_attention_count: redServices.length + amberServices.length,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { aircraft_id } = body;

    const aircraftList = aircraft_id
      ? [await base44.asServiceRole.entities.Aircraft.get(aircraft_id)]
      : await base44.asServiceRole.entities.Aircraft.list();

    let updated = 0;
    for (const ac of aircraftList) {
      if (!ac) continue;

      // Get all flights that count toward ORBIT
      const allFlights = await base44.asServiceRole.entities.Flight.filter({
        aircraft_id: ac.id,
        count_toward_orbit: true,
      });
      const validFlights = allFlights.filter(f => f.flight_status !== "cancelled");

      const totalHours = validFlights.reduce((s, f) => s + (f.block_hours || 0), 0);
      const totalCycles = validFlights.reduce((s, f) => s + (f.flight_cycle || 0), 0);
      
      // Filter flights after last ORBIT baseline date for accurate since calculations
      const flightsAfterOrbit = ac.last_orbit_baseline_date
        ? validFlights.filter(f => new Date(f.flight_date) > new Date(ac.last_orbit_baseline_date))
        : validFlights;
      const hoursSince = Math.max(0, flightsAfterOrbit.reduce((s, f) => s + (f.block_hours || 0), 0));
      const cyclesSince = Math.max(0, flightsAfterOrbit.reduce((s, f) => s + (f.flight_cycle || 0), 0));
      const lastDate = ac.last_orbit_baseline_date ? new Date(ac.last_orbit_baseline_date) : new Date(ac.created_date);
      const daysSince = Math.max(0, Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24)));

      // Step 1: Check 30-day protection window
      const lastBaselineDate = ac.last_orbit_baseline_date ? new Date(ac.last_orbit_baseline_date) : null;
      const daysSinceBaseline = lastBaselineDate 
        ? Math.max(0, Math.floor((new Date() - lastBaselineDate) / (1000 * 60 * 60 * 24))) 
        : 999;
      const isUnderProtection = daysSinceBaseline < 30;

      // Fetch service-level statuses for deriving aircraft status
      const serviceStatuses = await base44.asServiceRole.entities.AircraftServiceStatus.filter({
        aircraft_id: ac.id,
      });

      const summary = summarizeAircraftOrbitStatus(serviceStatuses);

      // Step 2: Determine aircraft ORBIT status
      // If within 30-day protection window: force Green
      let orbitStatus = summary.orbit_status;
      if (isUnderProtection) {
        orbitStatus = "Green";
      }

      // Score: worst service score * 100 (but 0 if under protection)
      const orbitScore = isUnderProtection
        ? 0
        : Math.min(Math.round(summary.worst_service_score * 100), 100);

      // Generate recommendation based on status
      let recommendation;
      if (isUnderProtection) {
        recommendation = "Aircraft under 30-day protection window";
      } else if (orbitStatus === "Red") {
        recommendation = summary.worst_service_name
          ? `ORBIT due — ${summary.worst_service_name} overdue`
          : "ORBIT overdue — schedule immediately";
      } else if (orbitStatus === "Amber") {
        recommendation = summary.worst_service_name
          ? `Schedule ORBIT soon — ${summary.worst_service_name} due soon`
          : "Schedule ORBIT soon";
      } else {
        recommendation = "No service needed yet";
      }

      // Update aircraft with calculated values
      await base44.asServiceRole.entities.Aircraft.update(ac.id, {
        current_total_hours: parseFloat(totalHours.toFixed(1)),
        current_total_cycles: totalCycles,
        hours_since_orbit: parseFloat(hoursSince.toFixed(1)),
        cycles_since_orbit: cyclesSince,
        days_since_orbit: daysSince,
        orbit_score: orbitScore,
        orbit_status: orbitStatus,
        worst_service_score: summary.worst_service_score,
        worst_service_name: summary.worst_service_name,
        worst_service_due_by: summary.worst_service_due_by,
        worst_service_trigger_source: summary.worst_service_trigger_source,
        overdue_count: summary.overdue_count,
        due_soon_count: summary.due_soon_count,
        healthy_count: summary.healthy_count,
        active_attention_count: summary.active_attention_count,
        within_protection_window: isUnderProtection,
        next_service_recommendation: recommendation,
      });
      updated++;
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
