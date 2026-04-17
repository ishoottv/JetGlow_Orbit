import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { maintenance_event_id } = await req.json();

    if (!maintenance_event_id) {
      return Response.json({ error: "maintenance_event_id is required" }, { status: 400 });
    }

    // Fetch maintenance event
    const event = await base44.asServiceRole.entities.MaintenanceEvent.get(maintenance_event_id);
    if (!event) {
      return Response.json({ error: "Maintenance event not found" }, { status: 404 });
    }

    const { aircraft_id, service_type, services_performed, service_date, total_hours_at_service, total_cycles_at_service } = event;

    if (!services_performed || services_performed.length === 0) {
      return Response.json({ error: "No services to process" }, { status: 400 });
    }

    // Get service rules for context
    const rules = await base44.asServiceRole.entities.ServiceTriggerRule.list();
    const serviceMap = rules.reduce((acc, r) => ({ ...acc, [r.service_code]: r }), {});

    // Delete old service logs for this event to avoid duplicates on re-processing
    const oldLogs = await base44.asServiceRole.entities.ServiceLog.filter({ maintenance_event_id });
    await Promise.all(oldLogs.map(log => base44.asServiceRole.entities.ServiceLog.delete(log.id)));

    const resetData = {
      last_service_date: service_date,
      last_service_total_hours: total_hours_at_service,
      last_service_total_cycles: total_cycles_at_service,
      days_since_last_service: 0,
      hours_since_last_service: 0,
      cycles_since_last_service: 0,
      due_by_days: 0,
      due_by_hours: 0,
      due_by_cycles: 0,
      service_trigger_score: 0,
      service_status: "Green",
      recommended_this_visit: false,
    };

    // Fetch all existing statuses for this aircraft in one call
    const allStatuses = await base44.asServiceRole.entities.AircraftServiceStatus.filter({ aircraft_id });
    const statusByCode = Object.fromEntries(allStatuses.map(s => [s.service_code, s]));

    // Process ONLY completed services (those in services_performed)
    await Promise.all(services_performed.map(async (serviceCode) => {
      const rule = serviceMap[serviceCode];
      if (!rule) return;

      // Create Service_Log entry
      await base44.asServiceRole.entities.ServiceLog.create({
        aircraft_id,
        maintenance_event_id,
        service_name: rule.service_name,
        service_code: serviceCode,
        service_date,
        total_hours_at_service,
        total_cycles_at_service,
        technician_name: event.technician_name || "",
        notes: event.work_performed || "",
      });

      // Reset ONLY this completed service
      const existing = statusByCode[serviceCode];
      const statusData = { aircraft_id, service_name: rule.service_name, service_code: serviceCode, ...resetData };
      if (existing) {
        await base44.asServiceRole.entities.AircraftServiceStatus.update(existing.id, statusData);
      } else {
        await base44.asServiceRole.entities.AircraftServiceStatus.create(statusData);
      }
    }));

    // Update aircraft baseline for ORBIT Visit or RESET
    // This baseline is the single source of truth for ORBIT tracking and protection window
    if (service_type === "ORBIT Visit" || service_type === "RESET") {
      console.log(`[processMaintenanceEvent] Updating aircraft baseline for ${service_type}`);
      await base44.asServiceRole.entities.Aircraft.update(aircraft_id, {
        last_orbit_baseline_date: service_date,
        last_orbit_total_hours: total_hours_at_service || 0,
        last_orbit_total_cycles: total_cycles_at_service || 0,
      });
    }

    // If RESET, delete ALL existing status records to clear old state
    if (service_type === "RESET") {
      console.log(`[processMaintenanceEvent] RESET branch — deleting all service statuses`);
      const latestStatuses = await base44.asServiceRole.entities.AircraftServiceStatus.filter({ aircraft_id });
      await Promise.all(latestStatuses.map(s => base44.asServiceRole.entities.AircraftServiceStatus.delete(s.id)));
    }

    return Response.json({ success: true, processed_services: services_performed.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});