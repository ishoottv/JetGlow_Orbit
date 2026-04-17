import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, Clock, Zap, Plus } from "lucide-react";
import { format, addDays } from "date-fns";
import { parseLocalDate } from "@/lib/dateUtils";
import { toast } from "sonner";

const SEVERITY_MULTIPLIERS = {
  "Light use": 1.1,
  "Moderate use": 1.0,
  "Heavy use": 0.85,
  "Charter / high turn": 0.7,
  "Harsh environment": 0.8,
};

export default function OrbitServiceDueCard({ aircraft, maintenanceEvents = [], onViewServices }) {
  const [baselineOpen, setBaselineOpen] = React.useState(false);
  const [baselineForm, setBaselineForm] = React.useState({
    last_orbit_baseline_date: aircraft?.last_orbit_baseline_date || new Date().toISOString().split("T")[0],
    last_orbit_total_hours: aircraft?.last_orbit_total_hours || 0,
    last_orbit_total_cycles: aircraft?.last_orbit_total_cycles || 0,
  });

  const queryClient = useQueryClient();

  // Get ORBIT rule for this aircraft's category
  const { data: orbitRule } = useQuery({
    queryKey: ["orbit-rule", aircraft?.aircraft_category],
    queryFn: () =>
      base44.entities.OrbitRule.filter({ aircraft_category: aircraft?.aircraft_category }).then(
        (rules) => rules[0] || null
      ),
    enabled: !!aircraft?.aircraft_category,
  });

  // Get ORBIT trigger override if exists
  const { data: triggerOverride } = useQuery({
    queryKey: ["orbit-override", aircraft?.id],
    queryFn: () =>
      base44.entities.AircraftServiceTriggerOverride.filter({
        aircraft_id: aircraft?.id,
        service_code: "ORBIT",
        use_custom_rules: true,
      }).then((overrides) => overrides[0] || null),
    enabled: !!aircraft?.id,
  });

  // Get ORBIT service status for effective intervals
  const { data: orbitServiceStatus } = useQuery({
    queryKey: ["orbit-service-status", aircraft?.id],
    queryFn: () =>
      base44.entities.AircraftServiceStatus.filter({
        aircraft_id: aircraft?.id,
        service_code: "ORBIT",
      }).then((statuses) => statuses[0] || null),
    enabled: !!aircraft?.id,
  });

  const updateAircraftMutation = useMutation({
    mutationFn: (data) => base44.entities.Aircraft.update(aircraft.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aircraft", aircraft.id] });
      setBaselineOpen(false);
      toast.success("ORBIT baseline updated");
    },
  });

  const handleSetBaseline = async (e) => {
    e.preventDefault();
    await updateAircraftMutation.mutateAsync({
      last_orbit_baseline_date: baselineForm.last_orbit_baseline_date,
      last_orbit_total_hours: parseFloat(baselineForm.last_orbit_total_hours) || 0,
      last_orbit_total_cycles: parseInt(baselineForm.last_orbit_total_cycles) || 0,
    });
  };

  // Calculate days since last baseline (Reset or ORBIT Service) for 30-day protection window
  const now = new Date();
  const lastBaselineDate = aircraft?.last_orbit_baseline_date ? parseLocalDate(aircraft.last_orbit_baseline_date) : null;
  const daysSinceBaseline = lastBaselineDate ? Math.floor((now - lastBaselineDate) / (1000 * 60 * 60 * 24)) : 999;
  const isUnderProtection = daysSinceBaseline < 30;

  // No baseline set
  if (!aircraft?.last_orbit_baseline_date) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-amber-900">No ORBIT Baseline Recorded</h3>
            <p className="text-sm text-amber-800 mt-1">
              Set the baseline ORBIT service date and aircraft time to begin tracking ORBIT health.
            </p>
            <Button
              onClick={() => setBaselineOpen(true)}
              size="sm"
              className="mt-3 gap-2 bg-amber-100 text-amber-900 hover:bg-amber-200"
            >
              <Plus className="w-4 h-4" />
              Set ORBIT Baseline
            </Button>
          </div>
        </div>

        <SetBaselineDialog
          open={baselineOpen}
          onOpenChange={setBaselineOpen}
          form={baselineForm}
          setForm={setBaselineForm}
          onSubmit={handleSetBaseline}
          loading={updateAircraftMutation.isPending}
        />
      </div>
    );
  }

  // Under 30-day protection window
  if (isUnderProtection) {
    const protectionPercent = Math.round(((30 - daysSinceBaseline) / 30) * 100);
    let protectionColor = "bg-green-50 border-green-200";
    let protectionTextColor = "text-green-900";
    let protectionBgColor = "bg-green-100";
    let protectionIconColor = "text-green-600";
    let progressColor = "bg-green-500";

    if (protectionPercent <= 10) {
      protectionColor = "bg-red-50 border-red-200";
      protectionTextColor = "text-red-900";
      protectionBgColor = "bg-red-100";
      protectionIconColor = "text-red-600";
      progressColor = "bg-red-500";
    } else if (protectionPercent <= 35) {
      protectionColor = "bg-amber-50 border-amber-200";
      protectionTextColor = "text-amber-900";
      protectionBgColor = "bg-amber-100";
      protectionIconColor = "text-amber-600";
      progressColor = "bg-amber-500";
    }

    return (
      <div className={`${protectionColor} border rounded-2xl p-6 space-y-4`}>
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${protectionBgColor} flex items-center justify-center`}>
            <Zap className={`w-4 h-4 ${protectionIconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className={`font-bold ${protectionTextColor}`}>ORBIT Health</h3>
            <p className={`text-sm ${protectionTextColor} mt-1`}>
              Service completed {daysSinceBaseline} day{daysSinceBaseline !== 1 ? 's' : ''} ago
            </p>
          </div>
        </div>
        <div className="bg-white/50 rounded-lg border p-4" style={{ borderColor: protectionColor.includes('green') ? '#dcfce7' : protectionColor.includes('amber') ? '#fef3c7' : '#fee2e2' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground">Protection Window</p>
            <p className="text-sm font-mono font-bold">{protectionPercent}%</p>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${progressColor} transition-all`}
              style={{ width: `${protectionPercent}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Get rule (override takes precedence)
  const rule = triggerOverride || orbitRule;
  if (!rule) {
    return (
      <div className="bg-muted/50 border border-border rounded-2xl p-6 text-center">
        <p className="text-sm text-muted-foreground">No ORBIT rule configured for this aircraft category</p>
      </div>
    );
  }

  const daysSince = aircraft.days_since_orbit || 0;
  const hoursSince = aircraft.hours_since_orbit || (aircraft.current_total_hours - aircraft.last_orbit_total_hours);
  const cyclesSince = aircraft.cycles_since_orbit || (aircraft.current_total_cycles - aircraft.last_orbit_total_cycles);

  // Calculate effective intervals using the same logic as calculateServiceTriggers
  const baseDayInterval = rule.day_interval || 0;
  const baseHourInterval = rule.hour_interval || 0;
  const baseCycleInterval = rule.cycle_interval || 0;

  // Apply severity multiplier (same logic as calculateServiceTriggers)
  const severityMultiplier = SEVERITY_MULTIPLIERS[aircraft.severity_profile] || 1.0;
  const effectiveDayInterval = baseDayInterval > 0 ? baseDayInterval * severityMultiplier : 0;
  const effectiveHourInterval = baseHourInterval > 0 ? baseHourInterval * severityMultiplier : 0;
  const effectiveCycleInterval = baseCycleInterval > 0 ? baseCycleInterval * severityMultiplier : 0;

  // Use effective intervals from service status if available (most accurate)
  const displayDayInterval = orbitServiceStatus?.applicable_day_interval || effectiveDayInterval;
  const displayHourInterval = orbitServiceStatus?.applicable_hour_interval || effectiveHourInterval;
  const displayCycleInterval = orbitServiceStatus?.applicable_cycle_interval || effectiveCycleInterval;

  // Calculate scores using effective intervals
  const dayScore = displayDayInterval > 0 ? daysSince / displayDayInterval : 0;
  const hourScore = displayHourInterval > 0 ? hoursSince / displayHourInterval : 0;
  const cycleScore = displayCycleInterval > 0 ? cyclesSince / displayCycleInterval : 0;
  const maxScore = Math.max(dayScore, hourScore, cycleScore);

  // Determine primary trigger (highest score)
  let primaryTrigger = "days";
  let primaryTriggerLabel = "Calendar (Days)";
  if (hourScore > dayScore && hourScore > cycleScore) {
    primaryTrigger = "hours";
    primaryTriggerLabel = "Flight Hours";
  }
  if (cycleScore > dayScore && cycleScore > hourScore) {
    primaryTrigger = "cycles";
    primaryTriggerLabel = "Cycles";
  }



  // Determine status
  const dueSoonPercent = (triggerOverride?.due_soon_percent || rule.due_soon_percent || 80) / 100;
  let status = "Green";
  let statusLabel = "NOT DUE";
  let statusColor = "bg-green-100 border-green-200 text-green-800";
  
  if (maxScore >= 1.0) {
    status = "Red";
    statusLabel = "OVERDUE";
    statusColor = "bg-red-100 border-red-200 text-red-800";
  } else if (maxScore >= dueSoonPercent) {
    status = "Amber";
    statusLabel = "DUE SOON";
    statusColor = "bg-amber-100 border-amber-200 text-amber-800";
  }

  // Calculate overdue amount or remaining
  let overdueAmount = null;
  let remainingAmount = null;
  if (status === "Red") {
    if (primaryTrigger === "days") {
      overdueAmount = `${Math.round(daysSince - displayDayInterval)} days`;
    } else if (primaryTrigger === "hours") {
      overdueAmount = `${(hoursSince - displayHourInterval).toFixed(1)} hours`;
    } else {
      overdueAmount = `${Math.round(cyclesSince - displayCycleInterval)} cycles`;
    }
  } else {
    if (primaryTrigger === "days") {
      remainingAmount = `${Math.max(0, Math.round(displayDayInterval - daysSince))} days`;
    } else if (primaryTrigger === "hours") {
      remainingAmount = `${Math.max(0, (displayHourInterval - hoursSince).toFixed(1))} hours`;
    } else {
      remainingAmount = `${Math.max(0, Math.round(displayCycleInterval - cyclesSince))} cycles`;
    }
  }

  // Calculate was due / next due date
  const wasDueDate = displayDayInterval > 0 && maxScore >= 1.0 ? addDays(lastBaselineDate, Math.round(displayDayInterval)) : null;
  const nextDueDate = displayDayInterval > 0 && maxScore < 1.0 ? addDays(lastBaselineDate, Math.round(displayDayInterval)) : null;

  // Determine rule source badge
  const isAdjusted = triggerOverride === null && severityMultiplier !== 1.0;
  const ruleBadge = triggerOverride ? (
    <Badge className="bg-blue-100 text-blue-700 border border-blue-200">Custom Aircraft Rule</Badge>
  ) : isAdjusted ? (
    <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">Adjusted Rule</Badge>
  ) : (
    <Badge className="bg-gray-100 text-gray-700 border border-gray-200">Default Rule</Badge>
  );

  // Build service interval display text
  const intervalText = displayDayInterval > 0 ? `${Math.round(displayDayInterval)} days` : 
                       displayHourInterval > 0 ? `${displayHourInterval.toFixed(0)} hours` : 
                       `${displayCycleInterval} cycles`;
  
  const adjustedText = isAdjusted && baseDayInterval > 0 ? ` (Adjusted from ${baseDayInterval} — ${aircraft.severity_profile})` : "";

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">ORBIT Service Status</h3>
        {ruleBadge}
      </div>

      {/* Primary Status - Most Prominent */}
      <div className={`${statusColor} border-2 rounded-xl p-6 space-y-3`}>
        <div className="text-center">
          <p className="text-3xl font-black tracking-tight">{statusLabel}</p>
          <p className="text-sm font-semibold mt-1 opacity-90">Triggered by {primaryTriggerLabel}</p>
        </div>
        {overdueAmount && (
          <p className="text-center text-lg font-bold">
            Overdue by {overdueAmount}
            {onViewServices && (
              <button
                onClick={onViewServices}
                className="block mt-2 text-sm font-semibold underline hover:opacity-70 transition-opacity"
              >
                View what needs to be done →
              </button>
            )}
          </p>
        )}
        {remainingAmount && status !== "Red" && (
          <p className="text-center text-lg font-bold">{remainingAmount} remaining</p>
        )}
      </div>

      {/* Core Information Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Last ORBIT Baseline</p>
          <p className="font-semibold text-lg">{format(lastBaselineDate, "MMM d, yyyy")}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Service Interval</p>
          <p className="font-semibold text-lg">{intervalText}{adjustedText}</p>
        </div>
      </div>

      {/* Primary Trigger Comparison */}
      <div className="bg-muted/30 rounded-lg border border-border p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Primary Trigger Comparison</p>
        <div className="space-y-2">
          {primaryTrigger === "days" ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Actual Usage:</span>
                <span className="font-semibold text-sm">{daysSince} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Effective Interval:</span>
                <span className="font-semibold text-sm">{Math.round(displayDayInterval)} days</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm font-semibold">{status === "Red" ? "Overdue By:" : "Remaining:"}</span>
                <span className={`font-bold text-sm ${status === "Red" ? "text-red-600" : "text-amber-600"}`}>
                  {status === "Red" 
                    ? `${Math.round(daysSince - displayDayInterval)} days`
                    : `${Math.round(displayDayInterval - daysSince)} days`}
                </span>
              </div>
            </>
          ) : primaryTrigger === "hours" ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Actual Usage:</span>
                <span className="font-semibold text-sm">{hoursSince.toFixed(1)} hours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Effective Interval:</span>
                <span className="font-semibold text-sm">{displayHourInterval.toFixed(0)} hours</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm font-semibold">{status === "Red" ? "Overdue By:" : "Remaining:"}</span>
                <span className={`font-bold text-sm ${status === "Red" ? "text-red-600" : "text-amber-600"}`}>
                  {status === "Red" 
                    ? `${(hoursSince - displayHourInterval).toFixed(1)} hours`
                    : `${(displayHourInterval - hoursSince).toFixed(1)} hours`}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Actual Usage:</span>
                <span className="font-semibold text-sm">{cyclesSince} cycles</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Effective Interval:</span>
                <span className="font-semibold text-sm">{Math.round(displayCycleInterval)} cycles</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm font-semibold">{status === "Red" ? "Overdue By:" : "Remaining:"}</span>
                <span className={`font-bold text-sm ${status === "Red" ? "text-red-600" : "text-amber-600"}`}>
                  {status === "Red" 
                    ? `${Math.round(cyclesSince - displayCycleInterval)} cycles`
                    : `${Math.round(displayCycleInterval - cyclesSince)} cycles`}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* All Metrics Summary */}
      <div className="bg-muted/20 rounded-lg border border-border p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">All Metrics</p>
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div>
            <p className="font-semibold">{daysSince} / {Math.round(displayDayInterval)}</p>
            <p className="text-muted-foreground">Days</p>
          </div>
          <div>
            <p className="font-semibold">{hoursSince.toFixed(1)} / {displayHourInterval.toFixed(0)}</p>
            <p className="text-muted-foreground">Hours</p>
          </div>
          <div>
            <p className="font-semibold">{cyclesSince} / {Math.round(displayCycleInterval)}</p>
            <p className="text-muted-foreground">Cycles</p>
          </div>
        </div>
      </div>

      {/* Progress Bar - Using Primary Trigger */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Progress to Next Service</p>
          <p className="text-sm font-mono">{Math.min(100, (maxScore * 100)).toFixed(0)}%</p>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              maxScore >= 1.0 ? "bg-red-500" : maxScore >= dueSoonPercent ? "bg-amber-500" : "bg-green-500"
            }`}
            style={{ width: `${Math.min(100, maxScore * 100)}%` }}
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setBaselineOpen(true)}
        className="w-full"
      >
        Update ORBIT Baseline
      </Button>

      <SetBaselineDialog
        open={baselineOpen}
        onOpenChange={setBaselineOpen}
        form={baselineForm}
        setForm={setBaselineForm}
        onSubmit={handleSetBaseline}
        loading={updateAircraftMutation.isPending}
      />
    </div>
  );
}

function SetBaselineDialog({ open, onOpenChange, form, setForm, onSubmit, loading }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set ORBIT Baseline</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Last ORBIT Baseline Date (Reset or ORBIT Service)</Label>
            <Input
              type="date"
              value={form.last_orbit_baseline_date}
              onChange={(e) => setForm({ ...form, last_orbit_baseline_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Total Hours at Service</Label>
              <Input
                type="number"
                step="0.1"
                value={form.last_orbit_total_hours}
                onChange={(e) =>
                  setForm({ ...form, last_orbit_total_hours: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Total Cycles at Service</Label>
              <Input
                type="number"
                value={form.last_orbit_total_cycles}
                onChange={(e) =>
                  setForm({ ...form, last_orbit_total_cycles: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Set Baseline"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}