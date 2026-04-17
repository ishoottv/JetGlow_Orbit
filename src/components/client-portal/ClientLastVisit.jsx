import React from "react";
import { format } from "date-fns";
import { Calendar, User, Wrench, CheckCircle2, FileText } from "lucide-react";

const SERVICE_TYPE_LABEL = {
  "ORBIT Visit": "ORBIT Maintenance Visit",
  "RESET": "Full Reset",
  "Add-On / Corrective": "Add-On / Corrective Service",
  "Quick Touch": "Quick Touch",
};

export default function ClientLastVisit({ events = [] }) {
  const last = [...events]
    .sort((a, b) => new Date(b.service_date) - new Date(a.service_date))[0];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Last Visit Summary</h2>
        <p className="text-sm text-muted-foreground mt-1">Most recent maintenance completed on your aircraft</p>
      </div>

      {!last ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center text-muted-foreground text-sm">
          No maintenance visits on record yet.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-muted/40 px-5 py-4 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Visit Type</p>
                <p className="font-bold text-base mt-0.5">{SERVICE_TYPE_LABEL[last.service_type] || last.service_type}</p>
              </div>
              <div className="text-sm sm:text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Date</p>
                <p className="font-bold">{format(new Date(last.service_date), "MMMM d, yyyy")}</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Technician */}
            {last.technician_name && (
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Technician</p>
                  <p className="font-semibold text-sm">{last.technician_name}</p>
                </div>
              </div>
            )}

            {/* Services Performed */}
            {last.services_performed?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Services Completed</p>
                </div>
                <div className="pl-6 space-y-1">
                  {last.services_performed.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Work Performed */}
            {last.work_performed && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Work Performed</p>
                </div>
                <p className="pl-6 text-sm leading-relaxed">{last.work_performed}</p>
              </div>
            )}

            {/* Notes */}
            {last.notes && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Technician Notes</p>
                </div>
                <p className="pl-6 text-sm text-muted-foreground italic leading-relaxed">{last.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}