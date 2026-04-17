import React, { useMemo } from "react";

function getDaysSince(dateString) {
  if (!dateString) return null;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function getProtectionRemainingPercent(daysSinceOrbit) {
  return daysSinceOrbit !== null
    ? Math.max(0, Math.min(100, ((30 - daysSinceOrbit) / 30) * 100))
    : 0;
}

export default function useOrbitScore(aircraft, serviceStatuses = []) {
  return useMemo(() => {
    if (!aircraft) return 100;

    const daysSinceOrbit = getDaysSince(aircraft.last_orbit_baseline_date);

    // 30-day aircraft-level protection window
    if (daysSinceOrbit !== null && daysSinceOrbit < 30) {
      return 100;
    }

    const worstScore =
      serviceStatuses.length > 0
        ? Math.max(
            ...serviceStatuses.map((s) => {
              const val = Number(s.service_trigger_score);
              return Number.isFinite(val) ? val : 0;
            })
          )
        : 0;

    const orbitScore = Math.round(Math.min(worstScore * 100, 100));
    return Math.max(0, 100 - orbitScore);
  }, [aircraft, serviceStatuses]);
}