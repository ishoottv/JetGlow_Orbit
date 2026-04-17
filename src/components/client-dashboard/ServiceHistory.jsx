import React from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function ServiceHistory({ events = [] }) {
  if (!events || events.length === 0) {
    return null;
  }

  const sortedEvents = [...events].sort((a, b) => new Date(b.service_date) - new Date(a.service_date));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Service History</h2>
        <p className="text-sm text-muted-foreground mt-1">Complete maintenance record</p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="divide-y divide-border">
          {sortedEvents.map((event, idx) => (
            <div key={event.id} className="p-5 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm">{format(new Date(event.service_date), "MMMM d, yyyy")}</h3>
                    <Badge variant="outline" className="text-xs">
                      {event.service_type}
                    </Badge>
                  </div>
                  {event.technician_name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Service by {event.technician_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Services Performed */}
              {event.services_performed && event.services_performed.length > 0 && (
                <div className="mb-3 pl-0">
                  <p className="text-xs text-muted-foreground font-semibold mb-2">Services:</p>
                  <div className="flex flex-wrap gap-2">
                    {event.services_performed.map((service, sIdx) => (
                      <Badge key={sIdx} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Work Performed */}
              {event.work_performed && (
                <p className="text-sm text-foreground leading-relaxed mb-2">{event.work_performed}</p>
              )}

              {/* Additional Notes */}
              {event.notes && (
                <p className="text-xs text-muted-foreground italic">{event.notes}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}