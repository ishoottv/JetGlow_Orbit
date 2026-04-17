import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const FLIGHTAWARE_API_KEY = Deno.env.get("FLIGHTAWARE_API_KEY");
const FA_BASE = "https://aeroapi.flightaware.com/aeroapi";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { tail_number, aircraft_id } = await req.json();
    if (!tail_number) return Response.json({ error: "tail_number is required" }, { status: 400 });

    const ident = tail_number.toUpperCase().trim();

    // Fetch flight history from FlightAware AeroAPI
    const response = await fetch(
      `${FA_BASE}/flights/${ident}?max_pages=1`,
      {
        headers: {
          "x-apikey": FLIGHTAWARE_API_KEY,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: `FlightAware API error: ${response.status} ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    const flightsList = data.flights || [];

    // Get existing flight IDs to avoid duplicates
    const existing = await base44.asServiceRole.entities.Flight.filter({ tail_number: ident });
    const existingIds = new Set(existing.map((f) => f.flight_id).filter(Boolean));

    let created = 0;
    for (const f of flightsList) {
      const faId = f.fa_flight_id;
      if (!faId || existingIds.has(faId)) continue;

      const depTime = f.actual_off || f.estimated_off || f.scheduled_off || null;
      const arrTime = f.actual_on || f.estimated_on || f.scheduled_on || null;

      let durationMinutes = null;
      if (depTime && arrTime) {
        durationMinutes = Math.round((new Date(arrTime) - new Date(depTime)) / 60000);
      }

      let status = "unknown";
      if (f.cancelled) status = "cancelled";
      else if (f.actual_on) status = "landed";
      else if (f.actual_off) status = "en_route";
      else if (f.scheduled_off) status = "scheduled";

      await base44.asServiceRole.entities.Flight.create({
        aircraft_id: aircraft_id || "",
        tail_number: ident,
        flight_id: faId,
        flight_number: f.ident || f.flight_number || "",
        origin: f.origin?.code || f.origin?.code_icao || "",
        origin_name: f.origin?.name || "",
        destination: f.destination?.code || f.destination?.code_icao || "",
        destination_name: f.destination?.name || "",
        departure_time: depTime,
        arrival_time: arrTime,
        status,
        aircraft_type: f.aircraft_type || "",
        duration_minutes: durationMinutes,
      });
      created++;
    }

    // Update last_checked on the aircraft record
    if (aircraft_id) {
      await base44.asServiceRole.entities.Aircraft.update(aircraft_id, {
        last_checked: new Date().toISOString(),
      });
    }

    return Response.json({
      success: true,
      fetched: flightsList.length,
      created,
      skipped: flightsList.length - created,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});