import React from "react";
import { format } from "date-fns";
import { MapPin, Calendar, Clock } from "lucide-react";

const conditionConfig = {
  Green: {
    label: "On Schedule",
    description: "Your aircraft is within its service schedule. No immediate action required.",
    bg: "bg-green-50",
    border: "border-green-200",
    dot: "bg-green-500",
    text: "text-green-800",
    badge: "bg-green-100 text-green-800 border-green-200",
  },
  Amber: {
    label: "Due Soon",
    description: "One or more services are approaching their due interval. A visit should be scheduled soon.",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
  },
  Red: {
    label: "Due Now / Overdue",
    description: "One or more services are overdue. Please contact JetGlow Aviation to schedule your ORBIT visit.",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    text: "text-red-800",
    badge: "bg-red-100 text-red-800 border-red-200",
  },
};

export default function ClientAircraftOverview({ aircraft, maintenanceEvents = [], customer }) {
  const condition = conditionConfig[aircraft.orbit_status] || conditionConfig.Green;

  // Find last Reset and last non-reset visit
  const sorted = [...maintenanceEvents].sort((a, b) => new Date(b.service_date) - new Date(a.service_date));
  const lastReset = sorted.find(e => e.service_type === "RESET");
  const lastOrbitVisit = sorted.find(e => e.service_type !== "RESET");

  // 30-day protection window
  const lastBaselineDate = aircraft.last_orbit_baseline_date ? new Date(aircraft.last_orbit_baseline_date) : null;
  const daysSinceBaseline = lastBaselineDate
    ? Math.floor((new Date() - lastBaselineDate) / (1000 * 60 * 60 * 24))
    : null;
  const isProtected = daysSinceBaseline !== null && daysSinceBaseline < 30;

  return (
    <div className="space-y-4">
      {/* Aircraft identity */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex gap-4 items-start">
            {aircraft.photo_url && (
              <img
                src={aircraft.photo_url}
                alt={aircraft.tail_number}
                className="w-20 h-20 object-cover rounded-xl border border-border flex-shrink-0"
              />
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Aircraft</p>
              <h1 className="text-3xl font-black font-mono tracking-wider">{aircraft.tail_number}</h1>
              <p className="text-base text-muted-foreground mt-1">{aircraft.make} {aircraft.model}</p>
              {aircraft.base_airport && (
                <div className="flex items-center gap-1.5 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-mono">{aircraft.base_airport}</span>
                </div>
              )}
              {customer && <p className="text-sm text-muted-foreground mt-1">{customer.name}</p>}
            </div>
          </div>

          {/* Condition status badge */}
          <div className={`${condition.badge} border rounded-xl px-4 py-2 text-center flex-shrink-0`}>
            <div className="flex items-center gap-2 justify-center">
              <span className={`w-2 h-2 rounded-full ${condition.dot}`} />
              <span className="text-xs font-semibold uppercase tracking-wide">Aircraft Condition</span>
            </div>
            <p className="font-bold text-lg mt-1">{condition.label}</p>
          </div>
        </div>

        {/* Condition description */}
        <div className={`mt-4 ${condition.bg} ${condition.border} border rounded-xl px-4 py-3`}>
          <p className={`text-sm ${condition.text}`}>{condition.description}</p>
          {isProtected && (
            <p className="text-xs text-green-700 mt-1 font-medium">
              ✓ Aircraft is within its 30-day post-service protection window.
            </p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatBox label="Total Flight Hours" value={(aircraft.current_total_hours || 0).toFixed(1)} unit="hours" />
        <StatBox label="Total Cycles" value={aircraft.current_total_cycles || 0} unit="takeoffs & landings" />
        <StatBox label="Days Since Service" value={aircraft.days_since_orbit || 0} unit="calendar days" />
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Last Reset</p>
          <p className="font-bold text-sm">
            {lastReset ? format(new Date(lastReset.service_date), "MMM d, yyyy") : "—"}
          </p>
          {lastReset?.technician_name && (
            <p className="text-xs text-muted-foreground mt-0.5">by {lastReset.technician_name}</p>
          )}
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Last ORBIT Visit</p>
          <p className="font-bold text-sm">
            {lastOrbitVisit ? format(new Date(lastOrbitVisit.service_date), "MMM d, yyyy") : "—"}
          </p>
          {lastOrbitVisit?.technician_name && (
            <p className="text-xs text-muted-foreground mt-0.5">by {lastOrbitVisit.technician_name}</p>
          )}
        </div>
        <StatBox label="Hours Since Service" value={(aircraft.hours_since_orbit || 0).toFixed(1)} unit="flight hours" />
      </div>
    </div>
  );
}

function StatBox({ label, value, unit }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{unit}</p>
    </div>
  );
}
