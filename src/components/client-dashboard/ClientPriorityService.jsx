import React from "react";
import { cn } from "@/lib/utils";

const driverMap = {
  days: "Driven by Calendar Days",
  hours: "Driven by Flight Hours",
  cycles: "Driven by Flight Cycles",
};

export default function ClientPriorityService({
  serviceName = null,
  dueBy = null,
  triggerSource = null,
}) {
  if (!serviceName) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-8 shadow-md">
        <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
          Priority Service Focus
        </h3>
        <p className="text-xs text-slate-500 mt-2 mb-6">
          The highest-priority service item currently influencing your aircraft condition
        </p>
        <p className="text-sm text-slate-500">No services currently requiring attention.</p>
      </div>
    );
  }

  const displayDriver = dueBy || triggerSource;
  const driverLabel = displayDriver ? driverMap[displayDriver] : null;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-8 shadow-md">
      <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
        Priority Service Focus
      </h3>
      <p className="text-xs text-slate-500 mt-2 mb-6">
        The highest-priority service item currently influencing your aircraft condition
      </p>

      <div className="space-y-6">
        {/* Service Name */}
        <div>
          <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-2">
            Service Area
          </p>
          <p className="text-lg font-semibold text-white">{serviceName}</p>
        </div>

        {/* Driver */}
        {driverLabel && (
          <div>
            <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-2">
              Primary Driver
            </p>
            <p className="text-sm text-slate-300">{driverLabel}</p>
          </div>
        )}

        {/* Divider and note */}
        <div className="pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            This service is the primary factor affecting your aircraft's Condition Index.
          </p>
        </div>
      </div>
    </div>
  );
}