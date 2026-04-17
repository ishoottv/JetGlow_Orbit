import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function rankServices(services) {
  const statusOrder = { Red: 0, Amber: 1, Green: 2, "No Interval": 3 };

  return [...services].sort((a, b) => {
    // 1. Higher score first
    const scoreA = a.service_trigger_score || 0;
    const scoreB = b.service_trigger_score || 0;
    const scoreDiff = Math.abs(scoreA - scoreB);
    
    if (scoreDiff > 0.0001) {
      return scoreB - scoreA;
    }

    // 2. Status severity: Red > Amber > Green > No Interval
    const statusA = statusOrder[a.service_status] ?? 4;
    const statusB = statusOrder[b.service_status] ?? 4;
    if (statusA !== statusB) {
      return statusA - statusB;
    }

    // 3. Overdue first
    const overdueA = a.service_overdue ? 0 : 1;
    const overdueB = b.service_overdue ? 0 : 1;
    if (overdueA !== overdueB) {
      return overdueA - overdueB;
    }

    // 4. Closest to due: use trigger_source to get active remaining
    const triggerSourceA = a.trigger_source || a.due_by || "days";
    const triggerSourceB = b.trigger_source || b.due_by || "days";

    let remainingA = Infinity;
    let remainingB = Infinity;

    if (triggerSourceA === "days") {
      remainingA = a.days_remaining ?? Infinity;
    } else if (triggerSourceA === "hours") {
      remainingA = a.hours_remaining ?? Infinity;
    } else if (triggerSourceA === "cycles") {
      remainingA = a.cycles_remaining ?? Infinity;
    }

    if (triggerSourceB === "days") {
      remainingB = b.days_remaining ?? Infinity;
    } else if (triggerSourceB === "hours") {
      remainingB = b.hours_remaining ?? Infinity;
    } else if (triggerSourceB === "cycles") {
      remainingB = b.cycles_remaining ?? Infinity;
    }

    if (Math.abs(remainingA - remainingB) > 0.0001) {
      return remainingA - remainingB;
    }

    // 5. Priority weight: higher = more important
    const priorityA = a.service_priority_weight ?? 25;
    const priorityB = b.service_priority_weight ?? 25;
    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }

    // 6. Alphabetical fallback
    return (a.service_name || "").localeCompare(b.service_name || "");
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { aircraft_id } = body;

    if (!aircraft_id) {
      return Response.json({ error: "aircraft_id required" }, { status: 400 });
    }

    // Fetch aircraft and service statuses
    const [aircraft, services] = await Promise.all([
      base44.asServiceRole.entities.Aircraft.get(aircraft_id),
      base44.asServiceRole.entities.AircraftServiceStatus.filter({ aircraft_id }),
    ]);

    if (!aircraft) {
      return Response.json({ error: "Aircraft not found" }, { status: 404 });
    }

    // Rank services
    const ranked = rankServices(services);
    const top10 = ranked.slice(0, 10);

    // Enhance each service with detailed sort reasoning
    const enrichedTop10 = top10.map((service, idx) => {
      const scoreA = (service.service_trigger_score || 0).toFixed(3);
      const statusOrder = { Red: 0, Amber: 1, Green: 2, "No Interval": 3 };
      const statusA = statusOrder[service.service_status] ?? 4;
      const overdueA = service.service_overdue ? "Yes" : "No";
      const triggerSourceA = service.trigger_source || service.due_by || "days";
      
      let remainingA = Infinity;
      if (triggerSourceA === "days") {
        remainingA = service.days_remaining ?? Infinity;
      } else if (triggerSourceA === "hours") {
        remainingA = service.hours_remaining ?? Infinity;
      } else if (triggerSourceA === "cycles") {
        remainingA = service.cycles_remaining ?? Infinity;
      }
      
      const priorityA = service.service_priority_weight ?? 25;
      
      // Construct detailed sort path
      const sortPath = `[Score: ${scoreA}] → [Status: ${service.service_status}/${statusA}] → [Overdue: ${overdueA}] → [Remaining: ${remainingA === Infinity ? "∞" : remainingA.toFixed(2)}${triggerSourceA}] → [Priority: ${priorityA}] → [Name: ${service.service_name}]`;

      return {
        rank: idx + 1,
        service_name: service.service_name,
        service_code: service.service_code,
        service_status: service.service_status,
        service_trigger_score: scoreA,
        trigger_source: triggerSourceA,
        service_priority_weight: priorityA,
        service_overdue: service.service_overdue,
        days_remaining: service.days_remaining,
        hours_remaining: service.hours_remaining,
        cycles_remaining: service.cycles_remaining,
        last_service_date: service.last_service_date,
        sort_path: sortPath,
      };
    });

    return Response.json({
      success: true,
      aircraft_id,
      aircraft_tail_number: aircraft.tail_number,
      total_services: services.length,
      top_10: enrichedTop10,
      ranking_rules: [
        "1. Highest trigger score",
        "2. Status severity (Red > Amber > Green)",
        "3. Overdue status (true first)",
        "4. Closest to due (lowest remaining in active source)",
        "5. Highest priority weight",
        "6. Alphabetical service name",
      ],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});