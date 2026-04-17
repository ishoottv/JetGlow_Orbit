import React from "react";
import { cn } from "@/lib/utils";
import ProtectionWindowBar from "@/components/shared/ProtectionWindowBar";
import { getServiceStatusLabel } from "@/lib/serviceStatusLabels";

export default function ClientConditionOverview({
  conditionIndex = 0,
  label = "On Schedule",
  message = "",
  baselineDate = null,
  orbitStatus = "Green",
}) {
  const getStatusColor = () => {
    if (orbitStatus === "Green") return "text-green-500";
    if (orbitStatus === "Amber") return "text-amber-500";
    if (orbitStatus === "Red") return "text-red-500";
    return "text-green-500";
  };

  const getStatusLabel = () => {
    return getServiceStatusLabel(orbitStatus);
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-8 shadow-md">
      {/* Header section */}
      <div className="mb-8 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
            Aircraft Condition
          </h3>
          <span className={cn("text-xs font-bold uppercase tracking-widest", getStatusColor())}>
            {getStatusLabel()}
          </span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
      </div>

      {/* Main display section */}
      <div className="flex items-end gap-8">
        {/* Condition Index */}
        <div>
          <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-3">
            Condition Index
          </p>
          <div className="flex items-baseline gap-1">
            <span className={cn("text-6xl font-black font-mono", getStatusColor())}>
              {conditionIndex}
            </span>
            <span className="text-slate-400 text-lg font-light">/100</span>
          </div>
        </div>

        {/* Circular progress ring */}
        <div className="relative w-28 h-28">
          <svg className="w-full h-full" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="rgba(100, 116, 139, 0.3)"
              strokeWidth="3"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${(conditionIndex / 100) * 339.29} 339.29`}
              strokeLinecap="round"
              className={getStatusColor()}
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "60px 60px",
                transition: "stroke-dasharray 0.8s ease-out",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-slate-400">
              {Math.round((conditionIndex / 100) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Protection window */}
      {baselineDate && (
        <div className="mt-8 pt-6 border-t border-slate-700">
          <ProtectionWindowBar baselineDate={baselineDate} showLabel={true} />
        </div>
      )}
    </div>
  );
}
