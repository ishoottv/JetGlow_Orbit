import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Plane, MapPin, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const statusStyles = {
  scheduled: "bg-blue-100 text-blue-700",
  en_route: "bg-amber-100 text-amber-700",
  landed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  unknown: "bg-gray-100 text-gray-700",
};

export default function FlightDetailDialog({ flight, open, onOpenChange, centers, onUpdate }) {
  const [centerId, setCenterId] = useState(flight?.flight_center_id || "none");
  const [notes, setNotes] = useState(flight?.notes || "");
  const [saving, setSaving] = useState(false);

  if (!flight) return null;

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(flight.id, {
      flight_center_id: centerId === "none" ? "" : centerId,
      notes,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-primary" />
            Flight Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Route */}
          <div className="flex items-center justify-center gap-6 py-4 bg-muted/50 rounded-xl">
            <div className="text-center">
              <p className="text-3xl font-bold">{flight.origin || "—"}</p>
              <p className="text-xs text-muted-foreground">{flight.origin_name}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="text-center">
              <p className="text-3xl font-bold">{flight.destination || "—"}</p>
              <p className="text-xs text-muted-foreground">{flight.destination_name}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Tail Number</p>
              <p className="font-semibold font-mono">{flight.tail_number}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge className={cn("mt-1", statusStyles[flight.status] || statusStyles.unknown)}>
                {flight.status?.replace("_", " ") || "unknown"}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Departure</p>
              <p className="font-semibold">
                {flight.departure_time ? format(new Date(flight.departure_time), "MMM d, yyyy HH:mm") : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Arrival</p>
              <p className="font-semibold">
                {flight.arrival_time ? format(new Date(flight.arrival_time), "MMM d, yyyy HH:mm") : "—"}
              </p>
            </div>
            {flight.duration_minutes && (
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-semibold">{Math.floor(flight.duration_minutes / 60)}h {flight.duration_minutes % 60}m</p>
              </div>
            )}
            {flight.aircraft_type && (
              <div>
                <p className="text-muted-foreground">Aircraft Type</p>
                <p className="font-semibold">{flight.aircraft_type}</p>
              </div>
            )}
          </div>

          {/* Flight Center assignment */}
          <div className="space-y-2">
            <Label>Flight Center</Label>
            <Select value={centerId} onValueChange={setCenterId}>
              <SelectTrigger>
                <SelectValue placeholder="Assign to a flight center" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {centers?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Add notes about this flight..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}