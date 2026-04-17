import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { aircraft_id } = body;

    // Fetch aircraft
    const aircraftList = aircraft_id
      ? [await base44.asServiceRole.entities.Aircraft.get(aircraft_id)]
      : await base44.asServiceRole.entities.Aircraft.list();

    let alertsCreated = 0;

    // Batch-fetch all service statuses and alerts
    const allStatuses = aircraft_id
      ? await base44.asServiceRole.entities.AircraftServiceStatus.filter({ aircraft_id })
      : await base44.asServiceRole.entities.AircraftServiceStatus.list();
    
    const allAlerts = aircraft_id
      ? await base44.asServiceRole.entities.Alert.filter({ aircraft_id })
      : await base44.asServiceRole.entities.Alert.list();

    // Delete old alerts in parallel
    const alertsToDelete = allAlerts.filter(a => a.alert_type === "Due Soon" || a.alert_type === "Overdue");
    if (alertsToDelete.length > 0) {
      await Promise.all(alertsToDelete.map(a => base44.asServiceRole.entities.Alert.delete(a.id)));
    }

    // Group statuses by aircraft and batch-create new alerts
    const alertsByAircraft = {};
    for (const status of allStatuses) {
      if (status.service_status === "Red" || status.service_status === "Amber") {
        if (!alertsByAircraft[status.aircraft_id]) alertsByAircraft[status.aircraft_id] = [];
        const aircraft = aircraftList.find(a => a.id === status.aircraft_id);
        alertsByAircraft[status.aircraft_id].push({
          aircraft_id: status.aircraft_id,
          tail_number: aircraft?.tail_number,
          alert_type: status.service_status === "Red" ? "Overdue" : "Due Soon",
          alert_message: `${status.service_name} ${status.service_status === "Red" ? "is OVERDUE" : "due soon"} (Score: ${status.service_trigger_score?.toFixed(2) || 0})`,
          alert_status: "active",
          due_date: status.last_service_date,
        });
      }
    }

    // Batch-create all alerts in parallel
    for (const [, alerts] of Object.entries(alertsByAircraft)) {
      if (alerts.length > 0) {
        await base44.asServiceRole.entities.Alert.bulkCreate(alerts);
        alertsCreated += alerts.length;
      }
    }

    return Response.json({ success: true, alertsCreated, aircraft: aircraftList.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});