/**
 * AIRCRAFT-LEVEL ORBIT SUMMARY & SCORING
 * 
 * Reads from AircraftServiceStatus records (service trigger truth source).
 * Does NOT duplicate service trigger logic.
 * Provides aircraft-level summary and client-facing presentation.
 */

/**
 * Summarize all service statuses for an aircraft into a single orbit status.
 * 
 * @param {Array} serviceStatuses - Array of AircraftServiceStatus records
 * @returns {Object} Aircraft-level summary
 */
export function summarizeAircraftOrbitStatus(serviceStatuses = []) {
  if (!Array.isArray(serviceStatuses) || serviceStatuses.length === 0) {
    return {
      orbit_status: "Green",
      worst_service_score: 0,
      worst_service_name: null,
      worst_service_due_by: null,
      worst_service_trigger_source: null,
      overdue_count: 0,
      due_soon_count: 0,
      healthy_count: 0,
      active_attention_count: 0,
    };
  }

  // Filter out "No Interval" services from status determination
  const validStatuses = serviceStatuses.filter(
    s => s.orbit_service_status !== "No Interval"
  );

  // Count by status
  const redServices = validStatuses.filter(s => s.orbit_service_status === "Red");
  const amberServices = validStatuses.filter(s => s.orbit_service_status === "Amber");
  const greenServices = validStatuses.filter(s => s.orbit_service_status === "Green");

  const overdue_count = redServices.length;
  const due_soon_count = amberServices.length;
  const healthy_count = greenServices.length;
  const active_attention_count = overdue_count + due_soon_count;

  // Determine aircraft orbit_status
  let orbit_status = "Green";
  if (redServices.length > 0) {
    orbit_status = "Red";
  } else if (amberServices.length > 0) {
    orbit_status = "Amber";
  }

  // Find worst service (highest trigger score)
  let worstService = null;
  let worst_service_score = 0;
  for (const status of serviceStatuses) {
    const score = status.service_trigger_score || 0;
    if (score > worst_service_score) {
      worst_service_score = score;
      worstService = status;
    }
  }

  return {
    orbit_status,
    worst_service_score: worst_service_score > 0 ? parseFloat(worst_service_score.toFixed(3)) : 0,
    worst_service_name: worstService?.service_name || null,
    worst_service_due_by: worstService?.due_by || null,
    worst_service_trigger_source: worstService?.trigger_source || null,
    overdue_count,
    due_soon_count,
    healthy_count,
    active_attention_count,
  };
}

/**
 * Calculate aircraft-level ORBIT score (0-100).
 * 
 * Applies 30-day protection window at aircraft level only.
 * Does NOT affect service_trigger_score or orbit_service_status.
 * Uses standardized daysSinceOrbit calculation from dateUtils.
 * 
 * @param {number} worstServiceScore - Highest service_trigger_score for the aircraft
 * @param {string} lastOrbitBaselineDate - Last ORBIT baseline date (ISO string)
 * @returns {Object} Orbit score data with protection window info
 */
export function calculateAircraftOrbitScore(
  worstServiceScore = 0,
  lastOrbitBaselineDate = null
) {
  // Import the standardized day calculation
  import { daysSinceOrbit } from './dateUtils.js';
  
  const sanitizedScore = Math.max(0, parseFloat(worstServiceScore) || 0);
  
  // Calculate days since baseline using standardized function
  const days_since_orbit = daysSinceOrbit(lastOrbitBaselineDate);
  const withinProtection = days_since_orbit < 30;

  // Apply 30-day protection window: ONLY protection affects aircraft score display
  let orbit_score;
  let condition_index;

  if (withinProtection) {
    // Within 30-day window: force aircraft score to 0 and condition to 100 (regardless of services)
    orbit_score = 0;
    condition_index = 100;
  } else {
    // After 30 days: normal calculation from worst service score
    orbit_score = Math.min(sanitizedScore * 100, 100);
    orbit_score = Math.round(orbit_score);
    condition_index = 100 - orbit_score;
  }

  return {
    orbit_score,
    condition_index,
    days_since_orbit,
    within_protection_window: withinProtection,
  };
}

/**
 * Get client-facing condition presentation.
 * 
 * Converts technical aircraft orbit_status to premium language.
 * 
 * @param {string} orbitStatus - Aircraft orbit_status (Green, Amber, Red)
 * @returns {Object} Client-facing labels and message
 */
export function getClientConditionPresentation(orbitStatus = "Green") {
  const labelMap = {
    Green: "In Good Standing",
    Amber: "Due Soon",
    Red: "Action Recommended",
  };

  const messageMap = {
    Green:
      "Your aircraft is currently in good standing within the JetGlow ORBIT condition program.",
    Amber:
      "One or more service items are approaching attention thresholds. Review is recommended soon.",
    Red:
      "One or more service items have exceeded service thresholds. Attention is recommended.",
  };

  const status = orbitStatus || "Green";

  return {
    client_condition_label: labelMap[status] || labelMap.Green,
    client_condition_message: messageMap[status] || messageMap.Green,
  };
}

/**
 * Get CSS class for status badge display.
 * 
 * @param {string} orbitStatus - Aircraft orbit_status
 * @returns {string} Tailwind CSS class
 */
export function getStatusBadgeClass(orbitStatus = "Green") {
  const classMap = {
    Green: "bg-green-50 border-green-200 text-green-700",
    Amber: "bg-amber-50 border-amber-200 text-amber-700",
    Red: "bg-red-50 border-red-200 text-red-700",
  };
  return classMap[orbitStatus] || classMap.Green;
}

/**
 * Get icon for status display.
 * 
 * @param {string} orbitStatus - Aircraft orbit_status
 * @returns {string} Icon name from lucide-react
 */
export function getStatusIcon(orbitStatus = "Green") {
  const iconMap = {
    Green: "CheckCircle2",
    Amber: "AlertCircle",
    Red: "XCircle",
  };
  return iconMap[orbitStatus] || "CheckCircle2";
}