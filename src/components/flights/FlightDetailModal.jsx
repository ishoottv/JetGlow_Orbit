import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plane, ArrowRight, Clock, Calendar, RotateCcw, Activity } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const statusStyles = {
  scheduled: "bg-blue-100 text-blue-700",
  en_route: "bg-amber-100 text-amber-700",
  landed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between items-start py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function formatDateTime(dt) {
  if (!dt) return "—";
  try { return format(parseISO(dt), "MMM d, yyyy  HH:mm 'UTC'"); } catch { return dt; }
}

export default function FlightDetailModal({ flight, open, onOpenChange }) {
  if (!flight) return null;

  const dep = flight.departure_airport || flight.origin || "—";
  const arr = flight.arrival_airport || flight.destination || "—";
  const depName = flight.origin_name || "";
  const arrName = flight.destination_name || "";

  const depTime = flight.actual_departure || flight.departure_time || flight.scheduled_departure;
  const arrTime = flight.actual_arrival || flight.arrival_time;

  const durationDisplay = flight.duration_minutes
    ? `${Math.floor(flight.duration_minutes / 60)}h ${flight.duration_minutes % 60}m`
    : flight.block_hours
    ? `${flight.block_hours.toFixed(1)} block hrs`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-primary" />
            Flight Detail — <span className="font-mono text-primary">{flight.tail_number}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Route banner */}
        <div className="flex items-center justify-center gap-4 py-5 bg-muted/50 rounded-xl mt-2">
          <div className="text-center">
            <p className="text-4xl font-black font-mono">{dep}</p>
            {depName && <p className="text-xs text-muted-foreground mt-1 max-w-[100px] truncate">{depName}</p>}
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div className="text-center">
            <p className="text-4xl font-black font-mono">{arr}</p>
            {arrName && <p className="text-xs text-muted-foreground mt-1 max-w-[100px] truncate">{arrName}</p>}
          </div>
        </div>

        {/* Status + date row */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {flight.flight_date || "—"}
          </div>
          <Badge className={cn("text-xs", statusStyles[flight.flight_status] || "bg-muted text-muted-foreground")}>
            {flight.flight_status?.replace("_", " ") || "—"}
          </Badge>
        </div>

        {/* Detail rows */}
        <div className="bg-card border border-border rounded-xl px-4 py-1 mt-1">
          <InfoRow label="FlightAware Flight ID" value={flight.flightaware_flight_id || flight.flight_id} />
          <InfoRow label="Flight Number / Ident" value={flight.flight_number} />
          <InfoRow label="Aircraft Type" value={flight.aircraft_type} />
          <InfoRow label="Block Hours" value={flight.block_hours != null ? `${flight.block_hours.toFixed(1)} hrs` : null} />
          <InfoRow label="Flight Cycles" value={flight.flight_cycle} />
          <InfoRow label="Duration" value={durationDisplay} />
          <InfoRow label="Actual Departure" value={formatDateTime(depTime)} />
          <InfoRow label="Actual Arrival" value={formatDateTime(arrTime)} />
          <InfoRow label="Wear Factor" value={flight.wear_factor ? `${flight.wear_factor}x` : null} />
          <InfoRow label="Counts Toward ORBIT" value={flight.count_toward_orbit ? "Yes" : "No"} />
          <InfoRow label="Import Source" value={flight.imported_source} />
          {flight.notes && <InfoRow label="Notes" value={flight.notes} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}