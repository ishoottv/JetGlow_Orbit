import React from "react";
import { getProtectionWindowElapsedPercent, getProtectionWindowRemainingPercent } from "@/lib/dateUtils";

export default function ProtectionWindowBar({ baselineDate = null, showLabel = true }) {
  if (!baselineDate) {
    return null;
  }

  const elapsedPercent = getProtectionWindowElapsedPercent(baselineDate);
  const remainingPercent = getProtectionWindowRemainingPercent(baselineDate);
  const daysElapsed = Math.floor((elapsedPercent / 100) * 30);
  const daysRemaining = Math.max(0, 30 - daysElapsed);

  // Only show if within protection window
  if (elapsedPercent >= 100) {
    return null;
  }

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
            ORBIT Protection Window
          </p>
          <p className="text-xs text-slate-500">
            {daysRemaining} days remaining
          </p>
        </div>
      )}
      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
        <div
          className="h-full bg-gradient-to-r from-green-600 to-green-500 rounded-full transition-all duration-500"
          style={{ width: `${elapsedPercent}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 text-center">
        {daysElapsed} of 30 days elapsed
      </p>
    </div>
  );
}