import React from "react";

export default function ClientServiceAttention({
  activeAttentionCount = 0,
  overdueCount = 0,
  dueSoonCount = 0,
  healthyCount = 0,
}) {
  const metrics = [
    {
      label: "Items Requiring Attention",
      value: activeAttentionCount,
      accentColor: "text-amber-500",
      subtleColor: "text-amber-500/20",
    },
    {
      label: "Overdue Services",
      value: overdueCount,
      accentColor: "text-red-500",
      subtleColor: "text-red-500/20",
    },
    {
      label: "Due Soon",
      value: dueSoonCount,
      accentColor: "text-amber-500",
      subtleColor: "text-amber-500/20",
    },
    {
      label: "Within Standard",
      value: healthyCount,
      accentColor: "text-green-500",
      subtleColor: "text-green-500/20",
    },
  ];

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-8 shadow-md">
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
          Service Attention Summary
        </h3>
        <p className="text-xs text-slate-500 mt-2">
          Real-time overview of service conditions across all categories
        </p>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-slate-700 bg-slate-900/50 p-3"
          >
            <p className="text-xs font-semibold text-slate-500 uppercase leading-tight break-words">
              {metric.label}
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <p className={`text-3xl font-bold font-mono ${metric.accentColor}`}>
                {metric.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}