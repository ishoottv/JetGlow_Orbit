import React from "react";
import { format } from "date-fns";
import { Plane, ArrowRight, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  en_route: "bg-amber-100 text-amber-700 border-amber-200",
  landed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  unknown: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function FlightCard({ flight, centerName, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-card rounded-2xl border border-border p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">{flight.tail_number}</span>
          {flight.flight_number && (
            <span className="text-xs text-muted-foreground">• {flight.flight_number}</span>
          )}
        </div>
        <Badge variant="outline" className={cn("text-xs border", statusStyles[flight.status] || statusStyles.unknown)}>
          {flight.status?.replace("_", " ") || "unknown"}
        </Badge>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold tracking-tight">{flight.origin || "—"}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[100px]">{flight.origin_name || ""}</p>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold tracking-tight">{flight.destination || "—"}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[100px]">{flight.destination_name || ""}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {flight.departure_time
            ? format(new Date(flight.departure_time), "MMM d, HH:mm")
            : "No departure time"}
        </div>
        {flight.duration_minutes && (
          <span>{Math.floor(flight.duration_minutes / 60)}h {flight.duration_minutes % 60}m</span>
        )}
        {centerName && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {centerName}
          </div>
        )}
      </div>
    </div>
  );
}