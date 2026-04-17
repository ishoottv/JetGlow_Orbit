import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { maintenance_event_id, aircraft_id, service_date, total_hours_at_service, total_cycles_at_service } = await req.json();

    let event;
    
    if (maintenance_event_id) {
      event = await base44.entities.MaintenanceEvent.get(maintenance_event_id);
    } else if (aircraft_id && service_date) {
      const events = await base44.entities.MaintenanceEvent.filter({
        aircraft_id,
        service_date,
      });
      event = events[0];
    }
    
    if (!event) {
      return Response.json({ error: "Maintenance event not found" }, { status: 404 });
    }

    // Update with hours and cycles (using service role for permission)
    const updated = await base44.asServiceRole.entities.MaintenanceEvent.update(event.id, {
      total_hours_at_service: parseFloat(total_hours_at_service) || 0,
      total_cycles_at_service: parseInt(total_cycles_at_service) || 0,
    });

    // Return success and let the frontend trigger recalc
    return Response.json({ success: true, updated });
  } catch (error) {
    console.error("fixMaintenanceRecord error:", error);
    return Response.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
});