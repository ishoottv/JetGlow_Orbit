import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { aircraft_id } = await req.json();

    if (!aircraft_id) {
      return Response.json({ error: "aircraft_id is required" }, { status: 400 });
    }

    // Get assignment
    const assignments = await base44.asServiceRole.entities.AircraftOrbitAssignment.filter({ aircraft_id });
    if (!assignments || assignments.length === 0) {
      return Response.json({ error: "No ORBIT assignment found" }, { status: 404 });
    }

    const assignment = assignments[0];
    const periodStart = new Date(assignment.current_period_start);
    const periodEnd = new Date(assignment.current_period_end);

    // Get flights in period
    const flights = await base44.asServiceRole.entities.Flight.filter({
      aircraft_id,
      flight_date: {
        $gte: periodStart.toISOString().split("T")[0],
        $lte: periodEnd.toISOString().split("T")[0],
      },
    });

    const hoursUsed = flights.reduce((sum, f) => sum + (f.block_hours || 0), 0);
    const cyclesUsed = flights.reduce((sum, f) => sum + (f.flight_cycle || 1), 0);

    // Update assignment with utilization
    await base44.asServiceRole.entities.AircraftOrbitAssignment.update(assignment.id, {
      hours_used_this_period: hoursUsed,
      cycles_used_this_period: cyclesUsed,
    });

    // Recalculate monthly scope
    await base44.asServiceRole.functions.invoke("calculateMonthlyOrbitScope", {
      aircraft_id,
      force_recalculate: true,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});