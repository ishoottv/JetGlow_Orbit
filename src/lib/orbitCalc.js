/**
 * ORBIT calculation utilities for JetGlow Aviation
 * Status and score are derived from service statuses, not OrbitRule.
 */

/**
 * Calculate days since a date string
 */
export function daysSince(dateStr) {
  if (!dateStr) return 0;
  const diff = new Date() - new Date(dateStr);
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}