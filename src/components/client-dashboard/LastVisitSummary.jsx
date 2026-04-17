import React from "react";
import { format } from "date-fns";
import { Wrench, Calendar, User } from "lucide-react";

export default function LastVisitSummary({ events = [] }) {
  // Get the most recent maintenance event
  const lastEvent = [...events]
    .filter(e => e.service_type !== "RESET") // Skip resets in summary
    .sort((a, b) => new Date(b.service_date) - new Date(a.service_date))[0];

  if (!lastEvent) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-bold text-lg mb-4">Last Visit</h3>
        <p className="text-sm text-muted-foreground">No visits recorded yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <h3 className="font-bold text-lg">Last Visit</h3>

      {/* Date & Technician */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-semibold text-sm">{format(new Date(lastEvent.service_date), "MMMM d, yyyy")}</p>
          </div>
        </div>

        {lastEvent.technician_name && (
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Technician</p>
              <p className="font-semibold text-sm">{lastEvent.technician_name}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Wrench className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Visit Type</p>
            <p className="font-semibold text-sm">{lastEvent.service_type}</p>
          </div>
        </div>
      </div>

      {/* Services Performed */}
      {lastEvent.services_performed && lastEvent.services_performed.length > 0 && (
        <>
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Services Completed</p>
            <div className="space-y-1">
              {lastEvent.services_performed.map((service, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span>{service}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Work Notes */}
      {lastEvent.work_performed && (
        <>
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Work Notes</p>
            <p className="text-sm text-foreground leading-relaxed">{lastEvent.work_performed}</p>
          </div>
        </>
      )}

      {/* Additional Notes */}
      {lastEvent.notes && (
        <>
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm text-foreground leading-relaxed">{lastEvent.notes}</p>
          </div>
        </>
      )}
    </div>
  );
}