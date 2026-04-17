import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TRACKING_MODE_CONFIG, getTrackingModeLabel } from "@/lib/trackingModeUtils";
import { recalculateAircraftStatus, refetchAircraftQueries } from "@/lib/recalculateAircraftStatus";

const TRACKING_OPTIONS = [
  { mode: "hours_only", label: "Hours only" },
  { mode: "cycles_only", label: "Cycles only" },
  { mode: "days_only", label: "Days only" },
  { mode: "hours_days", label: "Hours + Days" },
  { mode: "cycles_days", label: "Cycles + Days" },
  { mode: "hours_cycles", label: "Hours + Cycles" },
  { mode: "hours_cycles_days", label: "Hours + Cycles + Days" },
];

export default function TrackingModePanel({ aircraft, onSuccess }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [selectedMode, setSelectedMode] = useState(aircraft?.tracking_mode || "hours_days");

  const updateMutation = useMutation({
    mutationFn: async (trackingMode) => {
      const config = TRACKING_MODE_CONFIG[trackingMode];
      if (!config) throw new Error("Invalid tracking mode");

      const updateData = {
        tracking_mode: trackingMode,
        track_hours: config.track_hours,
        track_cycles: config.track_cycles,
        track_days: config.track_days,
      };

      // Update aircraft
      await base44.entities.Aircraft.update(aircraft.id, updateData);

      await recalculateAircraftStatus(aircraft.id);

      return trackingMode;
    },
    onSuccess: async (trackingMode) => {
      await refetchAircraftQueries(queryClient, aircraft.id);
      
      toast.success(`Tracking mode updated to ${getTrackingModeLabel(trackingMode)}`);
      setEditing(false);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error("Failed to update tracking mode: " + error.message);
    },
  });

  const config = TRACKING_MODE_CONFIG[selectedMode];
  const currentConfig = TRACKING_MODE_CONFIG[aircraft?.tracking_mode || "hours_days"];

  return (
    <Card className="bg-card border border-border rounded-2xl p-6">
      <div className="space-y-6">
        {/* Aircraft Default */}
        <div>
          <h3 className="font-bold text-lg mb-1">Service Tracking Method</h3>
          <p className="text-xs text-muted-foreground">
            How this aircraft's service intervals are tracked
          </p>
        </div>

        {!editing ? (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
              <p className="text-sm font-semibold text-foreground">
                {getTrackingModeLabel(aircraft?.tracking_mode || "hours_days")}
              </p>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                {currentConfig.track_hours && <span>✓ Hours</span>}
                {currentConfig.track_cycles && <span>✓ Cycles</span>}
                {currentConfig.track_days && <span>✓ Days</span>}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Change Tracking Mode
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Select Tracking Method</Label>
              <Select value={selectedMode} onValueChange={setSelectedMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRACKING_OPTIONS.map(opt => (
                    <SelectItem key={opt.mode} value={opt.mode}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {config && (
              <div className="bg-muted/30 rounded-lg p-4 border border-border/50 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Active Dimensions</p>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${config.track_hours ? "bg-green-500" : "bg-muted"}`} />
                    <span>{config.track_hours ? "Hours" : "Hours (disabled)"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${config.track_cycles ? "bg-green-500" : "bg-muted"}`} />
                    <span>{config.track_cycles ? "Cycles" : "Cycles (disabled)"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${config.track_days ? "bg-green-500" : "bg-muted"}`} />
                    <span>{config.track_days ? "Days" : "Days (disabled)"}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => updateMutation.mutate(selectedMode)}
                disabled={updateMutation.isPending || selectedMode === aircraft?.tracking_mode}
              >
                {updateMutation.isPending ? "Updating..." : "Apply"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedMode(aircraft?.tracking_mode || "hours_days");
                  setEditing(false);
                }}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}


      </div>
    </Card>
  );
}
