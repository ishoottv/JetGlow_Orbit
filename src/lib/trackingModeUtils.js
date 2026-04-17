/**
 * Tracking mode utilities for per-aircraft service tracking configuration.
 */

export const TRACKING_MODE_CONFIG = {
  hours_only: {
    label: "Hours only",
    track_hours: true,
    track_cycles: false,
    track_days: false,
  },
  cycles_only: {
    label: "Cycles only",
    track_hours: false,
    track_cycles: true,
    track_days: false,
  },
  days_only: {
    label: "Days only",
    track_hours: false,
    track_cycles: false,
    track_days: true,
  },
  hours_days: {
    label: "Hours + Days",
    track_hours: true,
    track_cycles: false,
    track_days: true,
  },
  cycles_days: {
    label: "Cycles + Days",
    track_hours: false,
    track_cycles: true,
    track_days: true,
  },
  hours_cycles: {
    label: "Hours + Cycles",
    track_hours: true,
    track_cycles: true,
    track_days: false,
  },
  hours_cycles_days: {
    label: "Hours + Cycles + Days",
    track_hours: true,
    track_cycles: true,
    track_days: true,
  },
};

/**
 * Get tracking mode label for UI display.
 */
export function getTrackingModeLabel(trackingMode) {
  return TRACKING_MODE_CONFIG[trackingMode]?.label || "Unknown";
}

/**
 * Determine tracking mode from boolean flags.
 */
export function determineTrackingMode(trackHours, trackCycles, trackDays) {
  if (trackHours && trackCycles && trackDays) return "hours_cycles_days";
  if (trackHours && trackCycles) return "hours_cycles";
  if (trackHours && trackDays) return "hours_days";
  if (trackCycles && trackDays) return "cycles_days";
  if (trackHours) return "hours_only";
  if (trackCycles) return "cycles_only";
  if (trackDays) return "days_only";
  return "hours_days"; // safe default
}

/**
 * Filter service trigger scores to only include active tracking dimensions.
 * Returns { score, source } or null if no active dimensions.
 */
export function getActiveTrackingScore(service, aircraft) {
  if (!aircraft) return null;

  const trackHours = aircraft.track_hours ?? true;
  const trackCycles = aircraft.track_cycles ?? false;
  const trackDays = aircraft.track_days ?? true;

  const scores = [];

  if (trackDays && service.due_by_days != null && isFinite(service.due_by_days)) {
    scores.push({ score: service.due_by_days, source: "days" });
  }
  if (trackHours && service.due_by_hours != null && isFinite(service.due_by_hours)) {
    scores.push({ score: service.due_by_hours, source: "hours" });
  }
  if (trackCycles && service.due_by_cycles != null && isFinite(service.due_by_cycles)) {
    scores.push({ score: service.due_by_cycles, source: "cycles" });
  }

  if (scores.length === 0) return null;

  // Return the highest (worst) active score
  const worst = scores.reduce((prev, curr) => (curr.score > prev.score ? curr : prev));
  return worst;
}

/**
 * Get active tracking summary string for debug display.
 */
export function getTrackingSummary(aircraft) {
  const parts = [];
  if (aircraft.track_hours) parts.push("Hours");
  if (aircraft.track_cycles) parts.push("Cycles");
  if (aircraft.track_days) parts.push("Days");
  return parts.length > 0 ? parts.join(" + ") : "None";
}