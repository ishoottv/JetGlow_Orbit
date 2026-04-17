import React, { useMemo } from "react";

/**
 * Calculate JetGlow Condition Index from weighted average of all service statuses
 * 
 * Returns: 0–100 (whole number integer only)
 * - 100 = freshly serviced / fully protected
 * - 70–99 = healthy condition
 * - 40–69 = attention approaching
 * - 1–39 = poor condition / due soon
 * - 0 = critically overdue
 */
export default function useConditionIndex(serviceStatuses = []) {
  return useMemo(() => {
    try {
      if (!serviceStatuses || serviceStatuses.length === 0) {
        return 100; // Default to perfect if no services tracked
      }

      // Step 1: Calculate weighted pressure across all services
      let weightedPressureSum = 0;
      let totalWeight = 0;
      let hasCriticalService = false;

      serviceStatuses.forEach(status => {
        const triggerScore = status.service_trigger_score || 0;
        const weight = status.condition_weight || 10;

        // Cap score at 1.25
        const effectiveScore = Math.min(triggerScore, 1.25);

        // Normalize to 0–1.0 pressure value
        const normalizedPressure = Math.min(effectiveScore / 1.25, 1.0);

        // Apply weight
        const weightedPressure = normalizedPressure * weight;

        weightedPressureSum += weightedPressure;
        totalWeight += weight;

        // Check for critical service (score >= 1.0 and weight >= 15)
        if (triggerScore >= 1.0 && weight >= 15) {
          hasCriticalService = true;
        }
      });

      // Step 2: Calculate overall pressure
      const overallPressure = totalWeight > 0 ? weightedPressureSum / totalWeight : 0;

      // Step 3: Convert to Condition Index (0–100)
      let conditionIndex = Math.round((1 - overallPressure) * 100);

      // Step 4: Clamp to 0–100
      conditionIndex = Math.max(0, Math.min(conditionIndex, 100));

      // Step 5: Apply critical-service penalty
      if (hasCriticalService) {
        conditionIndex -= 5;
        // Clamp again after penalty
        conditionIndex = Math.max(0, Math.min(conditionIndex, 100));
      }

      return conditionIndex;
    } catch (err) {
      console.error("Error calculating condition index:", err);
      return 100; // Fallback to perfect if calculation fails
    }
  }, [JSON.stringify(serviceStatuses)]);
}