/**
 * CENTRALIZED TRIGGER CALCULATION ENGINE
 * 
 * This is the ONLY place where orbit_service_status is calculated.
 * All parts of the app must READ from calculated status fields, not recalculate.
 */

function isValidInterval(value) {
  return typeof value === "number" && value > 0 && isFinite(value);
}

function sanitizeNumber(value, defaultValue = 0) {
  const num = parseFloat(value);
  return isFinite(num) && num >= 0 ? num : defaultValue;
}

/**
 * Calculate the service trigger status from usage progress.
 * 
 * @param {number} daysSince - Days since last service
 * @param {number} hoursSince - Hours since last service
 * @param {number} cyclesSince - Cycles since last service
 * @param {number} effectiveDayInterval - Day interval (already multiplied by severity)
 * @param {number} effectiveHourInterval - Hour interval (already multiplied by severity)
 * @param {number} effectiveCycleInterval - Cycle interval (already multiplied by severity)
 * @returns {Object} Trigger status object with score, status, and metadata
 */
export function calculateServiceTrigger(
  daysSince,
  hoursSince,
  cyclesSince,
  effectiveDayInterval,
  effectiveHourInterval,
  effectiveCycleInterval
) {
  // Sanitize all inputs
  const sanitizedDays = sanitizeNumber(daysSince, 0);
  const sanitizedHours = sanitizeNumber(hoursSince, 0);
  const sanitizedCycles = sanitizeNumber(cyclesSince, 0);

  // Build list of valid interval progressions
  const progressions = [];

  const dayScore = isValidInterval(effectiveDayInterval)
    ? sanitizedDays / effectiveDayInterval
    : null;
  const hourScore = isValidInterval(effectiveHourInterval)
    ? sanitizedHours / effectiveHourInterval
    : null;
  const cycleScore = isValidInterval(effectiveCycleInterval)
    ? sanitizedCycles / effectiveCycleInterval
    : null;

  if (dayScore !== null) progressions.push({ score: dayScore, source: "days" });
  if (hourScore !== null) progressions.push({ score: hourScore, source: "hours" });
  if (cycleScore !== null) progressions.push({ score: cycleScore, source: "cycles" });

  // No valid intervals — service has no triggering condition
  if (progressions.length === 0) {
    return {
      service_trigger_score: 0,
      orbit_service_status: "No Interval",
      service_due: false,
      service_overdue: false,
      due_by: null,
      trigger_source: null,
    };
  }

  // Find worst (highest) score
  const worst = progressions.reduce((prev, curr) =>
    curr.score > prev.score ? curr : prev
  );

  const triggerScore = worst.score;

  // Fixed thresholds — DO NOT CHANGE
  let status;
  if (triggerScore >= 1.0) {
    status = "Red";
  } else if (triggerScore >= 0.8) {
    status = "Amber";
  } else {
    status = "Green";
  }

  return {
    service_trigger_score: parseFloat(triggerScore.toFixed(3)),
    orbit_service_status: status,
    service_due: triggerScore >= 1.0,
    service_overdue: triggerScore > 1.0,
    due_by: worst.source,
    trigger_source: worst.source,
  };
}

/**
 * Get status color for UI display — READ ONLY, no calculation.
 * Components MUST use this to avoid duplicating status logic.
 */
export function getStatusColor(orbitServiceStatus) {
  const colorMap = {
    Green: "text-green-600",
    Amber: "text-amber-600",
    Red: "text-red-600",
    "No Interval": "text-gray-400",
  };
  return colorMap[orbitServiceStatus] || "text-gray-400";
}

/**
 * Get status background for badges — READ ONLY, no calculation.
 */
export function getStatusBadgeClass(orbitServiceStatus) {
  const classMap = {
    Green: "bg-green-50 border-green-200 text-green-700",
    Amber: "bg-amber-50 border-amber-200 text-amber-700",
    Red: "bg-red-50 border-red-200 text-red-700",
    "No Interval": "bg-gray-50 border-gray-200 text-gray-700",
  };
  return classMap[orbitServiceStatus] || "bg-gray-50 border-gray-200 text-gray-700";
}