import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { aircraft_id } = await req.json();
    
    if (!aircraft_id) {
      return Response.json({ error: 'aircraft_id required' }, { status: 400 });
    }

    // Fetch aircraft and all service statuses
    const aircraft = await base44.entities.Aircraft.get(aircraft_id);
    const allServices = await base44.entities.AircraftServiceStatus.filter({ aircraft_id });

    // Find Cabin Door
    const cabinDoor = allServices.find(s => s.service_name === 'Cabin Door Cleaning');
    
    if (!cabinDoor) {
      return Response.json({ error: 'Cabin Door Cleaning not found in service statuses' }, { status: 404 });
    }

    // Calculate Cabin Door details
    const cabinDoorAudit = {
      service_name: cabinDoor.service_name,
      service_status: cabinDoor.service_status,
      service_trigger_score: cabinDoor.service_trigger_score || 0,
      trigger_source: cabinDoor.trigger_source || 'unknown',
      last_service_date: cabinDoor.last_service_date || null,
      days_since_last_service: cabinDoor.days_since_last_service || 0,
      hours_since_last_service: cabinDoor.hours_since_last_service || 0,
      cycles_since_last_service: cabinDoor.cycles_since_last_service || 0,
      applicable_day_interval: cabinDoor.applicable_day_interval || null,
      applicable_hour_interval: cabinDoor.applicable_hour_interval || null,
      applicable_cycle_interval: cabinDoor.applicable_cycle_interval || null,
      due_by_days: cabinDoor.due_by_days || 0,
      due_by_hours: cabinDoor.due_by_hours || 0,
      due_by_cycles: cabinDoor.due_by_cycles || 0,
      is_overdue: cabinDoor.service_overdue || false,
    };

    // Sort all services by trigger score descending to find ranking
    const sortedServices = [...allServices].sort((a, b) => {
      return (b.service_trigger_score || 0) - (a.service_trigger_score || 0);
    });

    // Find Cabin Door's position
    const cabinDoorRank = sortedServices.findIndex(s => s.id === cabinDoor.id) + 1;

    // Get top 4 (Cabin Door + next 3)
    const topServices = sortedServices.slice(0, 4).map((s, idx) => ({
      rank: idx + 1,
      service_name: s.service_name,
      service_status: s.service_status,
      service_trigger_score: s.service_trigger_score || 0,
      trigger_source: s.trigger_source || 'unknown',
      last_service_date: s.last_service_date || null,
      days_since_last_service: s.days_since_last_service || 0,
      hours_since_last_service: s.hours_since_last_service || 0,
      cycles_since_last_service: s.cycles_since_last_service || 0,
      applicable_day_interval: s.applicable_day_interval || null,
      applicable_hour_interval: s.applicable_hour_interval || null,
      applicable_cycle_interval: s.applicable_cycle_interval || null,
      due_by_days: s.due_by_days || 0,
      due_by_hours: s.due_by_hours || 0,
      due_by_cycles: s.due_by_cycles || 0,
      calculation: `MAX(${s.due_by_days || 0}, ${s.due_by_hours || 0}, ${s.due_by_cycles || 0}) = ${s.service_trigger_score || 0}`,
    }));

    // Verify Cabin Door is first
    const cabinDoorIsWorst = topServices[0]?.service_name === 'Cabin Door Cleaning';

    // Aircraft-level fields for stale data check
    const aircraftWorstFields = {
      worst_service_name: aircraft.worst_service_name,
      worst_service_score: aircraft.worst_service_score,
      worst_service_trigger_source: aircraft.worst_service_trigger_source,
    };

    return Response.json({
      cabin_door_audit: cabinDoorAudit,
      cabin_door_rank: cabinDoorRank,
      cabin_door_is_worst: cabinDoorIsWorst,
      top_4_ranked_services: topServices,
      aircraft_level_worst_fields: aircraftWorstFields,
      live_worst_service: topServices[0],
      mismatch_detected: aircraftWorstFields.worst_service_name !== topServices[0]?.service_name,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});