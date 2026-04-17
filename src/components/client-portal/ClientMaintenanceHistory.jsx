import React from "react";
import { format } from "date-fns";

const TYPE_STYLES = {
  "ORBIT Visit":       { dot: "bg-primary", label: "ORBIT Visit" },
  "RESET":             { dot: "bg-blue-500", label: "Full Reset" },
  "Add-On / Corrective": { dot: "bg-amber-500", label: "Add-On Service" },
  "Quick Touch":       { dot: "bg-muted-foreground", label: "Quick Touch" },
};

export default function ClientMaintenanceHistory({ events = [] }) {
  if (!events || events.length === 0) return null;

  const sorted = [...events].sort((a, b) => new Date(b.service_date) - new Date(a.service_date));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Maintenance History</h2>
        <p className="text-sm text-muted-foreground mt-1">Complete record of all ORBIT service visits</p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="divide-y divide-border">
          {sorted.map((event, idx) => {
            const typeStyle = TYPE_STYLES[event.service_type] || { dot: "bg-muted-foreground", label: event.service_type };
            return (
              <div key={event.id} className="px-5 py-4 flex gap-4">
                {/* Timeline dot */}
                <div className="flex flex-col items-center pt-1">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${typeStyle.dot}`} />
                  {idx < sorted.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>

                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <span className="font-bold text-sm">{typeStyle.label}</span>
                      {event.technician_name && (
                        <span className="text-xs text-muted-foreground ml-2">by {event.technician_name}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-medium flex-shrink-0">
                      {format(new Date(event.service_date), "MMM d, yyyy")}
                    </span>
                  </div>

                  {/* Services performed as pills */}
                  {event.services_performed?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {event.services_performed.map((s, i) => (
                        <span key={i} className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {event.work_performed && (
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{event.work_performed}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}