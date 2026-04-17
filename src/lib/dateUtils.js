/**
 * Standardized date utilities for ORBIT baseline calculations.
 * Single source of truth for all days_since_orbit calculations.
 */

/**
 * Calculate days since a baseline date (e.g., last ORBIT service).
 * Uses consistent rounding (floor) to match ISO date math.
 *
 * @param {string} baselineDate - ISO date string or null
 * @returns {number} Days since baseline (0 if no baseline or date is in future)
 */
export function daysSinceOrbit(baselineDate) {
  if (!baselineDate) return 0;

  const baseline = new Date(baselineDate);
  const today = new Date();

  // Ensure we're comparing at midnight UTC for consistency
  const baselineTime = new Date(baseline.getFullYear(), baseline.getMonth(), baseline.getDate());
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diff = todayTime - baselineTime;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return Math.max(0, days); // Never negative
}

/**
 * Check if aircraft is within 30-day ORBIT protection window.
 *
 * @param {string} baselineDate - ISO date string
 * @returns {boolean} True if days_since_orbit < 30
 */
export function isWithinProtectionWindow(baselineDate) {
  return daysSinceOrbit(baselineDate) < 30;
}

/**
 * Calculate elapsed protection window as percentage (0-100).
 * Represents how many days into the 30-day window have elapsed.
 *
 * @param {string} baselineDate - ISO date string
 * @returns {number} Percentage elapsed (0-100, clamped)
 */
export function getProtectionWindowElapsedPercent(baselineDate) {
  const days = daysSinceOrbit(baselineDate);
  const percent = (days / 30) * 100;
  return Math.min(Math.max(percent, 0), 100);
}

/**
 * Calculate remaining protection window as percentage (0-100).
 * Represents how many days remain in the 30-day window.
 *
 * @param {string} baselineDate - ISO date string
 * @returns {number} Percentage remaining (0-100, clamped)
 */
export function getProtectionWindowRemainingPercent(baselineDate) {
  const days = daysSinceOrbit(baselineDate);
  const remaining = Math.max(0, 30 - days);
  const percent = (remaining / 30) * 100;
  return Math.min(Math.max(percent, 0), 100);
}

/**
 * Parse a local date string (YYYY-MM-DD format) into a Date object.
 * Used for form inputs and local date handling.
 *
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Date} Date object at midnight local time
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}