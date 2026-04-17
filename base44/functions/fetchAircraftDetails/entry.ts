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

    // Fetch aircraft details from FlightAware
    const response = await fetch(
      `${FA_BASE}/aircraft/${ident}`,
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

    // Extract make and model from the aircraft type string
    let make = "", model = "";
    if (data.type) {
      const parts = data.type.split(" ");
      if (parts.length >= 2) {
        make = parts[0];
        model = parts.slice(1).join(" ");
      } else {
        make = data.type;
      }
    }

    // Update aircraft if ID provided
    if (aircraft_id) {
      await base44.asServiceRole.entities.Aircraft.update(aircraft_id, {
        make: make || undefined,
        model: model || undefined,
      });
    }

    return Response.json({
      success: true,
      make,
      model,
      type: data.type,
      manufacturer: data.manufacturer,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});