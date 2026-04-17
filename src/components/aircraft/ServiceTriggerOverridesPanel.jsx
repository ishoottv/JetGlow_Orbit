import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { recalculateAircraftStatus, refetchAircraftQueries } from "@/lib/recalculateAircraftStatus";
import { getServiceFrequencyBucket } from "@/lib/serviceClassification";
import { getEffectiveSchedule, getScheduleSummary } from "@/lib/serviceScheduleDisplay";

export default function ServiceTriggerOverridesPanel({ aircraft }) {
  const queryClient = useQueryClient();
  const [editingService, setEditingService] = useState(null);
  const [showDisabledServices, setShowDisabledServices] = useState(false);

  const { data: rules = [] } = useQuery({
    queryKey: ["service-rules"],
    queryFn: () => base44.entities.ServiceTriggerRule.filter({ is_active: true }),
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ["aircraft-overrides", aircraft.id],
    queryFn: () => base44.entities.AircraftServiceTriggerOverride.filter({ aircraft_id: aircraft.id }),
  });

  const updateOverrideMutation = useMutation({
    mutationFn: async (override) => {
      const existing = overrides.find(o => o.service_code === override.service_code);
      const shouldDeleteOverride = !override.use_custom_rules && (override.service_enabled ?? true);

      if (existing && shouldDeleteOverride) {
        return base44.entities.AircraftServiceTriggerOverride.delete(existing.id);
      } else if (existing) {
        return base44.entities.AircraftServiceTriggerOverride.update(existing.id, override);
      } else if (!shouldDeleteOverride) {
        return base44.entities.AircraftServiceTriggerOverride.create(override);
      }
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["aircraft-overrides", aircraft.id] });
      await recalculateAircraftStatus(aircraft.id);
      await refetchAircraftQueries(queryClient, aircraft.id);
      toast.success("Override updated");
      setEditingService(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const buildBaseOverride = (rule, override) => ({
    aircraft_id: aircraft.id,
    service_code: rule.service_code,
    service_name: rule.service_name,
    service_enabled: override?.service_enabled ?? true,
    use_custom_rules: override?.use_custom_rules ?? false,
    use_aircraft_tracking_default: override?.use_aircraft_tracking_default ?? true,
    service_track_hours: override?.service_track_hours ?? aircraft.track_hours,
    service_track_cycles: override?.service_track_cycles ?? aircraft.track_cycles,
    service_track_days: override?.service_track_days ?? aircraft.track_days,
    day_interval: override?.day_interval ?? rule.day_interval,
    hour_interval: override?.hour_interval ?? rule.hour_interval,
    cycle_interval: override?.cycle_interval ?? rule.cycle_interval,
    due_soon_percent: override?.due_soon_percent ?? rule.due_soon_percent,
    notes: override?.notes ?? "",
  });

  const handleToggleServiceEnabled = (rule, override, enabled) => {
    const nextOverride = {
      ...buildBaseOverride(rule, override),
      service_enabled: enabled,
    };
    updateOverrideMutation.mutate(nextOverride);
  };

  const sort = arr => [...arr].sort((a, b) => a.service_name.localeCompare(b.service_name));
  const disabledServiceCodes = new Set(
    overrides.filter(o => o.service_enabled === false).map(o => o.service_code)
  );
  
  const enabledRules = rules.filter(r => !disabledServiceCodes.has(r.service_code));
  const disabledRules = sort(rules.filter(r => disabledServiceCodes.has(r.service_code)));

  const coreServices = sort(enabledRules.filter(r => getServiceFrequencyBucket(r) === "monthly"));
  const quarterlyServices = sort(enabledRules.filter(r => getServiceFrequencyBucket(r) === "quarterly"));
  const semiannualServices = sort(enabledRules.filter(r => getServiceFrequencyBucket(r) === "semiannual"));
  const yearlyServices = sort(enabledRules.filter(r => getServiceFrequencyBucket(r) === "yearly"));

  const renderServiceItem = (rule) => {
    const override = overrides.find(o => o.service_code === rule.service_code);
    const isOverridden = override?.use_custom_rules;
    const isDisabled = override?.service_enabled === false;
    const effectiveRule = isOverridden ? { ...rule, ...override } : rule;
    const schedule = getEffectiveSchedule(effectiveRule);

    return (
      <div 
        key={rule.service_code}
        onClick={() => setEditingService(rule)}
        className={cn(
          "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 flex items-center justify-between gap-3 cursor-pointer hover:shadow-md transition-shadow",
          isDisabled && "opacity-60 border-dashed"
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{rule.service_name}</p>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{rule.service_code}</span>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">{getScheduleSummary(effectiveRule)}</Badge>
            <Badge variant="secondary" className="text-xs">{schedule.label}</Badge>
            {isDisabled && (
              <Badge className="bg-slate-200 text-slate-700 border-slate-300 text-xs">Disabled</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-muted-foreground font-medium">
              {isDisabled ? "Off" : "On"}
            </span>
            <Switch
              checked={!isDisabled}
              disabled={updateOverrideMutation.isPending}
              onCheckedChange={(checked) => handleToggleServiceEnabled(rule, override, checked)}
              aria-label={`Toggle ${rule.service_name}`}
            />
          </div>
          {isOverridden && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs flex-shrink-0">
              Override
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const groups = [
    { services: coreServices, title: "Core Monthly Services", badge: "Every Visit", badgeClass: "bg-primary/10 text-primary border-primary/20" },
    { services: quarterlyServices, title: "Quarterly Condition Maintenance", badge: "Quarterly", badgeClass: "bg-slate-200 text-slate-700 border-slate-300" },
    { services: semiannualServices, title: "Semiannual Condition Maintenance", badge: "Semiannual", badgeClass: "bg-teal-100 text-teal-700 border-teal-200" },
    { services: yearlyServices, title: "Yearly Condition Maintenance", badge: "Annual", badgeClass: "bg-purple-100 text-purple-700 border-purple-200" },
  ].filter(g => g.services.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-lg">Service Interval Overrides</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Click any service to customize intervals or disable it for this aircraft.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Show Disabled Services</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review services that are currently excluded from calculations for this aircraft.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {disabledRules.length > 0 && (
            <Badge className="bg-slate-200 text-slate-700 border-slate-300 text-xs">
              {disabledRules.length} disabled
            </Badge>
          )}
          <Switch
            checked={showDisabledServices}
            onCheckedChange={setShowDisabledServices}
            aria-label="Show disabled services"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {groups.map((group, idx) => (
          <div key={idx}>
            <div className="flex items-center gap-3 mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{group.title}</h4>
              <Badge className={cn("text-xs", group.badgeClass)}>{group.badge}</Badge>
            </div>
            <div className="space-y-2">
              {group.services.map(renderServiceItem)}
            </div>
          </div>
        ))}
      </div>

      {showDisabledServices && disabledRules.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Disabled Services</h4>
            <Badge className="bg-slate-200 text-slate-700 border-slate-300 text-xs">
              Excluded From Calculations
            </Badge>
          </div>
          <div className="grid lg:grid-cols-2 gap-2">
            {disabledRules.map(renderServiceItem)}
          </div>
        </div>
      )}

      {rules.length === 0 && (
        <p className="text-xs text-muted-foreground py-8 text-center">No service rules configured</p>
      )}

      {editingService && (
        <OverrideDialog
          open={!!editingService}
          onOpenChange={(open) => !open && setEditingService(null)}
          rule={editingService}
          override={overrides.find(o => o.service_code === editingService.service_code)}
          aircraft={aircraft}
          onSave={(data) => updateOverrideMutation.mutate(data)}
          isPending={updateOverrideMutation.isPending}
        />
      )}
    </div>
  );
}

function OverrideDialog({ open, onOpenChange, rule, override, aircraft, onSave, isPending }) {
  const [form, setForm] = useState(override || {
    aircraft_id: aircraft.id,
    service_code: rule.service_code,
    service_name: rule.service_name,
    service_enabled: true,
    use_custom_rules: false,
    service_track_hours: aircraft.track_hours,
    service_track_cycles: aircraft.track_cycles,
    service_track_days: aircraft.track_days,
    day_interval: rule.day_interval,
    hour_interval: rule.hour_interval,
    cycle_interval: rule.cycle_interval,
  });

  const selectedTrackingType =
    form.service_track_hours ? "hours" :
    form.service_track_cycles ? "cycles" :
    "days";

  const setTrackingType = (type) => {
    setForm({
      ...form,
      service_track_days: type === "days",
      service_track_hours: type === "hours",
      service_track_cycles: type === "cycles",
    });
  };

  const handleReset = () => {
    setForm({
      aircraft_id: aircraft.id,
      service_code: rule.service_code,
      service_name: rule.service_name,
      service_enabled: true,
      use_custom_rules: false,
      service_track_hours: aircraft.track_hours,
      service_track_cycles: aircraft.track_cycles,
      service_track_days: aircraft.track_days,
      day_interval: rule.day_interval,
      hour_interval: rule.hour_interval,
      cycle_interval: rule.cycle_interval,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const requiredInterval =
      selectedTrackingType === "hours"
        ? form.hour_interval
        : selectedTrackingType === "cycles"
          ? form.cycle_interval
          : form.day_interval;

    if (form.service_enabled !== false && form.use_custom_rules && !requiredInterval) {
      toast.error("Enter a value for the selected tracking driver");
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">{rule.service_name}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 font-mono">{rule.service_code}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Override toggle */}
          <label className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg border border-border cursor-pointer hover:bg-muted/60 transition-colors">
            <Checkbox
              checked={form.service_enabled !== false}
              onCheckedChange={(checked) => setForm({ ...form, service_enabled: !!checked })}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">Service Enabled</p>
              <p className="text-xs text-muted-foreground mt-0.5">Turn off to exclude this service from all calculations for this aircraft</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors">
            <Checkbox
              checked={form.use_custom_rules || false}
              onCheckedChange={(checked) => setForm({ ...form, use_custom_rules: checked })}
              className="mt-0.5"
              disabled={form.service_enabled === false}
            />
            <div>
              <p className="text-sm font-semibold text-foreground">Custom Override</p>
              <p className="text-xs text-muted-foreground mt-0.5">Enable aircraft-specific intervals</p>
            </div>
          </label>

          {/* Tracking mode selection */}
          <div className={cn("space-y-3", form.service_enabled === false && "opacity-50 pointer-events-none")}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tracking Driver</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <Checkbox
                  checked={selectedTrackingType === "days"}
                  onCheckedChange={() => setTrackingType("days")}
                />
                <span className="text-sm font-medium">Calendar Days</span>
              </label>
              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <Checkbox
                  checked={selectedTrackingType === "hours"}
                  onCheckedChange={() => setTrackingType("hours")}
                />
                <span className="text-sm font-medium">Flight Hours</span>
              </label>
              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <Checkbox
                  checked={selectedTrackingType === "cycles"}
                  onCheckedChange={() => setTrackingType("cycles")}
                />
                <span className="text-sm font-medium">Flight Cycles</span>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose the single schedule that should make this service due for this aircraft.
            </p>
          </div>

          {/* Interval inputs */}
          <div className={cn("space-y-3", form.service_enabled === false && "opacity-50 pointer-events-none")}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Interval Values</p>
            <div className="space-y-2.5">
              {selectedTrackingType === "days" && (
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Days</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.day_interval || ""}
                    onChange={(e) => setForm({ ...form, day_interval: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder={rule.day_interval || "30"}
                  />
                </div>
              )}
              {selectedTrackingType === "hours" && (
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Hours</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.hour_interval || ""}
                    onChange={(e) => setForm({ ...form, hour_interval: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder={rule.hour_interval || "100"}
                  />
                </div>
              )}
              {selectedTrackingType === "cycles" && (
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Cycles</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.cycle_interval || ""}
                    onChange={(e) => setForm({ ...form, cycle_interval: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder={rule.cycle_interval || "50"}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Saving..." : "Save"}
            </Button>
            {(form.use_custom_rules || override?.use_custom_rules) && (
              <Button type="button" variant="outline" onClick={handleReset} disabled={isPending}>
                Reset
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
