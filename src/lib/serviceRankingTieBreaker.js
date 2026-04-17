/**
 * Deterministic service ranking with tie-breaking logic.
 * 
 * Priority order:
 * 1. Highest service_trigger_score
 * 2. Status severity: Red > Amber > Green
 * 3. is_overdue (true first)
 * 4. Closest to due (lowest days_remaining, then hours_remaining, then cycles_remaining)
 * 5. Lowest trigger_priority (service priority tier)
 * 6. service_name (alphabetical, deterministic fallback)
 */

export function rankServices(services) {
  const statusOrder = { Red: 0, Amber: 1, Green: 2, "No Interval": 3 };

  return [...services].sort((a, b) => {
    // 1. Higher score first
    const scoreA = a.service_trigger_score || 0;
    const scoreB = b.service_trigger_score || 0;
    if (Math.abs(scoreA - scoreB) > 0.0001) {
      return scoreB - scoreA;
    }

    // 2. Status severity: Red > Amber > Green
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

    // 4. Closest to due: only use the active trigger source
    // For each service, determine which interval is actively driving the score
    const triggerSourceA = a.trigger_source || a.due_by || "days";
    const triggerSourceB = b.trigger_source || b.due_by || "days";

    let remainingA = Infinity;
    let remainingB = Infinity;

    // Get remaining for service A based on its trigger source
    if (triggerSourceA === "days") {
      remainingA = a.days_remaining ?? Infinity;
    } else if (triggerSourceA === "hours") {
      remainingA = a.hours_remaining ?? Infinity;
    } else if (triggerSourceA === "cycles") {
      remainingA = a.cycles_remaining ?? Infinity;
    }

    // Get remaining for service B based on its trigger source
    if (triggerSourceB === "days") {
      remainingB = b.days_remaining ?? Infinity;
    } else if (triggerSourceB === "hours") {
      remainingB = b.hours_remaining ?? Infinity;
    } else if (triggerSourceB === "cycles") {
      remainingB = b.cycles_remaining ?? Infinity;
    }

    // Lower remaining = closer to due = ranks higher (comes first)
    if (Math.abs(remainingA - remainingB) > 0.0001) {
      return remainingA - remainingB;
    }

    // 5. Service priority weight (higher number = higher operational importance)
    const priorityWeightA = a.service_priority_weight ?? 100;
    const priorityWeightB = b.service_priority_weight ?? 100;
    if (priorityWeightA !== priorityWeightB) {
      return priorityWeightB - priorityWeightA;
    }

    // 6. Fallback: alphabetical service name
    return (a.service_name || "").localeCompare(b.service_name || "");
  });
}

/**
 * Identify the worst (highest ranked) service from a list.
 */
export function getWorstService(services) {
  const ranked = rankServices(services);
  return ranked.length > 0 ? ranked[0] : null;
}