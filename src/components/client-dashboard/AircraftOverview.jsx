import React from "react";
import { format } from "date-fns";
import OrbitStatusBadge from "../shared/OrbitStatusBadge";

export default function AircraftOverview({ aircraft }) {
  const lastBaselineDate = aircraft?.last_orbit_baseline_date ? new Date(aircraft.last_orbit_baseline_date) : null;
  const daysSinceBaseline = lastBaselineDate 
    ? Math.max(0, Math.floor((new Date() - lastBaselineDate) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
      {/* Status Banner */}
      <div className="flex items-start justify-between gap-6 mb-8 pb-8 border-b border-border">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Aircraft Health</p>
          <div className="flex items-center gap-3 mt-2">
            <h2 className="text-2xl font-bold">ORBIT Status</h2>
            <OrbitStatusBadge status={aircraft.orbit_status || "Green"} size="lg" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {/* Last Baseline */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Last Service</p>
          <p className="text-lg font-bold">
            {lastBaselineDate ? format(lastBaselineDate, "MMM d, yyyy") : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {daysSinceBaseline !== null ? `${daysSinceBaseline} days ago` : "No service recorded"}
          </p>
        </div>

        {/* Days Since */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Days Since</p>
          <p className="text-lg font-bold">{aircraft.days_since_orbit || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">calendar days</p>
        </div>

        {/* Total Hours */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Total Hours</p>
          <p className="text-lg font-bold">{(aircraft.current_total_hours || 0).toFixed(1)}</p>
          <p className="text-xs text-muted-foreground mt-1">flight hours</p>
        </div>

        {/* Total Cycles */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Total Cycles</p>
          <p className="text-lg font-bold">{aircraft.current_total_cycles || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">takeoffs & landings</p>
        </div>

        {/* Hours Since */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Hours Since</p>
          <p className="text-lg font-bold">{(aircraft.hours_since_orbit || 0).toFixed(1)}</p>
          <p className="text-xs text-muted-foreground mt-1">flight hours</p>
        </div>

        {/* Cycles Since */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Cycles Since</p>
          <p className="text-lg font-bold">{aircraft.cycles_since_orbit || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">operations</p>
        </div>
      </div>
    </div>
  );
}