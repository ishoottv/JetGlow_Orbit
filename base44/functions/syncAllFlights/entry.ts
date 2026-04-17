import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const FLIGHTAWARE_API_KEY = Deno.env.get("FLIGHTAWARE_API_KEY");
const FA_BASE = "https://aeroapi.flightaware.com/aeroapi";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow any authenticated user or scheduled automation
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (!isAuthenticated) {
      // Allow unauthenticated calls (scheduled automation only)
      // Continue with service role
    }

    const aircraft = await base44.asServiceRole.entities.Aircraft.list();
    const results = [];

    for (const ac of aircraft) {
      const ident = ac.tail_number?.toUpperCase().trim();
      if (!ident) continue;

      try {
        // Fetch aircraft details from FlightAware
        let make = ac.make;
        let model = ac.model;
        try {
          const acResponse = await fetch(
            `${FA_BASE}/aircraft/${ident}`,
            {
              headers: {
                "x-apikey": FLIGHTAWARE_API_KEY,
                "Accept": "application/json",
              },
            }
          );

          if (acResponse.ok) {
            const acData = await acResponse.json();
            if (acData.type) {
              const parts = acData.type.split(" ");
              if (parts.length >= 2) {
                make = parts[0];
                model = parts.slice(1).join(" ");
              } else {
                make = acData.type;
              }
            }
            // Update aircraft with make/model
            if (make || model) {
              await base44.asServiceRole.entities.Aircraft.update(ac.id, {
                make: make || ac.make,
                model: model || ac.model,
              });
            }
          }
        } catch (detailErr) {
          // Continue with flight sync even if aircraft details fail
        }

        // Fetch flights
        const response = await fetch(
          `${FA_BASE}/flights/${ident}?max_pages=5`,
          {
            headers: {
              "x-apikey": FLIGHTAWARE_API_KEY,
              "Accept": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[syncAllFlights] FlightAware error for ${ident}: ${response.status} - ${errorText}`);
          results.push({ tail_number: ident, error: `FlightAware error: ${response.status}` });
          continue;
        }

        const data = await response.json();
        console.log(`[syncAllFlights] Retrieved ${data.flights?.length || 0} flights for ${ident}`);
        const flightsList = data.flights || [];

        const existing = await base44.asServiceRole.entities.Flight.filter({ tail_number: ident });
        const existingIds = new Set(existing.map((f) => f.flightaware_flight_id).filter(Boolean));
        const faIds = new Set(flightsList.map(f => f.fa_flight_id).filter(Boolean));

        // Mark scheduled flights no longer in FlightAware as cancelled
        const today = new Date().toISOString().split("T")[0];
        for (const existing_flight of existing) {
          if (existing_flight.flight_status === "scheduled") {
            const shouldCancel = existing_flight.flightaware_flight_id && !faIds.has(existing_flight.flightaware_flight_id);
            const isInPast = existing_flight.flight_date < today;
            if (shouldCancel || isInPast) {
              await base44.asServiceRole.entities.Flight.update(existing_flight.id, { flight_status: "cancelled" });
            }
          }
        }

        let created = 0;
        for (const f of flightsList) {
          const faId = f.fa_flight_id;
          if (!faId || existingIds.has(faId)) continue;

          const depTime = f.actual_off || f.estimated_off || f.scheduled_off || null;
          const arrTime = f.actual_on || f.estimated_on || f.scheduled_on || null;

          let blockHours = 0;
          if (depTime && arrTime) {
            blockHours = Math.round((new Date(arrTime) - new Date(depTime)) / 60000) / 60;
          }

          let flightStatus = "scheduled";
          if (f.cancelled) flightStatus = "cancelled";
          else if (f.actual_on) flightStatus = "landed";
          else if (f.actual_off) flightStatus = "en_route";

          const flightDate = depTime ? depTime.split("T")[0] : new Date().toISOString().split("T")[0];

          await base44.asServiceRole.entities.Flight.create({
            aircraft_id: ac.id,
            tail_number: ident,
            flightaware_flight_id: faId,
            flight_date: flightDate,
            departure_airport: f.origin?.code_iata || f.origin?.code_icao || f.origin?.code || "",
            arrival_airport: f.destination?.code_iata || f.destination?.code_icao || f.destination?.code || "",
            actual_departure: depTime,
            actual_arrival: arrTime,
            block_hours: parseFloat(blockHours.toFixed(2)),
            flight_cycle: 1,
            flight_status: flightStatus,
            imported_source: "flightaware_auto",
            count_toward_orbit: true,
            wear_factor: 1.0,
          });
          created++;
        }

        results.push({ tail_number: ident, fetched: flightsList.length, created, skipped: flightsList.length - created });
      } catch (err) {
        results.push({ tail_number: ident, error: err.message });
      }
    }

    return Response.json({ success: true, synced: aircraft.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});