import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Thresholds
const ORBIT_INTERVAL_DAYS = 30;
const ORBIT_WARN_DAYS = 24; // warn at 80% of interval
const RESET_INTERVAL_DAYS = 365;
const RESET_WARN_DAYS = 300; // warn at ~82% of interval

function daysSince(dateStr) {
  if (!dateStr) return null;
  const ms = new Date() - new Date(dateStr);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both authenticated users and scheduled calls (service role)
    const body = await req.json().catch(() => ({}));

    const aircraftList = await base44.asServiceRole.entities.Aircraft.list();

    // Fetch all maintenance events once and group by aircraft
    const allEvents = await base44.asServiceRole.entities.MaintenanceEvent.list();
    const eventsByAircraft = {};
    for (const evt of allEvents) {
      if (!eventsByAircraft[evt.aircraft_id]) eventsByAircraft[evt.aircraft_id] = [];
      eventsByAircraft[evt.aircraft_id].push(evt);
    }

    // Clear existing maintenance interval alerts
    const existingAlerts = await base44.asServiceRole.entities.Alert.filter({ alert_type: "Days Threshold" });
    if (existingAlerts.length > 0) {
      await Promise.all(existingAlerts.map(a => base44.asServiceRole.entities.Alert.delete(a.id)));
    }

    const alertsToCreate = [];

    for (const ac of aircraftList) {
      if (ac.status === "archived") continue;

      const events = eventsByAircraft[ac.id] || [];

      // --- Last ORBIT alert ---
      const orbitDate = ac.last_orbit_baseline_date;
      const orbitDays = daysSince(orbitDate);
      if (orbitDays !== null) {
        if (orbitDays >= ORBIT_INTERVAL_DAYS) {
          alertsToCreate.push({
            aircraft_id: ac.id,
            tail_number: ac.tail_number,
            alert_type: "Days Threshold",
            alert_message: `ORBIT service is OVERDUE — last performed ${orbitDays} days ago (interval: ${ORBIT_INTERVAL_DAYS} days)`,
            alert_status: "active",
            due_date: orbitDate,
          });
        } else if (orbitDays >= ORBIT_WARN_DAYS) {
          alertsToCreate.push({
            aircraft_id: ac.id,
            tail_number: ac.tail_number,
            alert_type: "Days Threshold",
            alert_message: `ORBIT service approaching — last performed ${orbitDays} days ago (due in ${ORBIT_INTERVAL_DAYS - orbitDays} days)`,
            alert_status: "active",
            due_date: orbitDate,
          });
        }
      }

      // --- Last RESET alert ---
      const lastReset = events
        .filter(e => e.service_type === "RESET")
        .sort((a, b) => new Date(b.service_date) - new Date(a.service_date))[0];

      const resetDate = lastReset?.service_date || null;
      const resetDays = daysSince(resetDate);
      if (resetDays !== null) {
        if (resetDays >= RESET_INTERVAL_DAYS) {
          alertsToCreate.push({
            aircraft_id: ac.id,
            tail_number: ac.tail_number,
            alert_type: "Days Threshold",
            alert_message: `JetGlow RESET is OVERDUE — last reset ${resetDays} days ago (annual interval)`,
            alert_status: "active",
            due_date: resetDate,
          });
        } else if (resetDays >= RESET_WARN_DAYS) {
          alertsToCreate.push({
            aircraft_id: ac.id,
            tail_number: ac.tail_number,
            alert_type: "Days Threshold",
            alert_message: `JetGlow RESET approaching — last reset ${resetDays} days ago (due in ${RESET_INTERVAL_DAYS - resetDays} days)`,
            alert_status: "active",
            due_date: resetDate,
          });
        }
      } else if (!resetDate) {
        // No reset on record — flag it
        alertsToCreate.push({
          aircraft_id: ac.id,
          tail_number: ac.tail_number,
          alert_type: "Days Threshold",
          alert_message: `No JetGlow RESET on record for this aircraft`,
          alert_status: "active",
          due_date: null,
        });
      }
    }

    if (alertsToCreate.length > 0) {
      await base44.asServiceRole.entities.Alert.bulkCreate(alertsToCreate);
    }

    return Response.json({ success: true, alertsCreated: alertsToCreate.length, aircraftProcessed: aircraftList.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});