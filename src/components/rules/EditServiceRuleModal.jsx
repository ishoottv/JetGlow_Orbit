import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { toast } from "sonner";

const WORK_CLASS_COLORS = {
  monthly: "bg-primary/10 text-primary border-primary/20",
  quarterly: "bg-muted text-muted-foreground border-border",
  semiannual: "bg-teal-100 text-teal-700 border-teal-200",
  yearly: "bg-purple-100 text-purple-700 border-purple-200",
};

const WORK_CLASS_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semiannual", label: "Semiannual" },
  { value: "yearly", label: "Yearly" },
];

const TRACKING_TYPE_OPTIONS = [
  { value: "days", label: "Calendar Days" },
  { value: "hours", label: "Flight Hours" },
  { value: "cycles", label: "Flight Cycles" },
];

const INTERVAL_CONFIG = {
  days: {
    label: "Service Interval (Days)",
    field: "day_interval",
    step: "1",
    placeholder: "e.g. 30",
  },
  hours: {
    label: "Service Interval (Flight Hours)",
    field: "hour_interval",
    step: "0.5",
    placeholder: "e.g. 50",
  },
  cycles: {
    label: "Service Interval (Flight Cycles)",
    field: "cycle_interval",
    step: "1",
    placeholder: "e.g. 30",
  },
};

export default function EditServiceRuleModal({ open, onOpenChange, rule, onSave, saving = false }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (rule) {
      setForm({
        work_class: rule.work_class || "monthly",
        tracking_type: rule.tracking_type || "days",
        hour_interval: rule.hour_interval || "",
        cycle_interval: rule.cycle_interval || "",
        day_interval: rule.day_interval || "",
        due_soon_percent: rule.due_soon_percent || 80,
      });
    }
  }, [rule]);

  const handleSave = () => {
    const trackingType = form.tracking_type || "days";
    const intervalCfg = INTERVAL_CONFIG[trackingType];
    const intervalValue = parseFloat(form[intervalCfg.field]);

    if (!intervalValue || intervalValue <= 0) {
      toast.error(`Please enter a valid interval value for ${intervalCfg.label}`);
      return;
    }

    const updates = {
      work_class: form.work_class,
      tracking_type: trackingType,
      // Save all three intervals — only the selected one is used for triggers
      hour_interval: form.hour_interval ? parseFloat(form.hour_interval) : null,
      cycle_interval: form.cycle_interval ? parseFloat(form.cycle_interval) : null,
      day_interval: form.day_interval ? parseFloat(form.day_interval) : null,
      due_soon_percent: form.due_soon_percent ? parseFloat(form.due_soon_percent) : 80,
    };
    onSave(updates);
    onOpenChange(false);
  };

  if (!rule) return null;

  const wc = form.work_class || "monthly";
  const trackingType = form.tracking_type || "days";
  const intervalCfg = INTERVAL_CONFIG[trackingType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rule.service_name}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">{rule.service_code}</p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Work Class */}
          <div className="space-y-2">
            <Label>Work Class</Label>
            <Select value={wc} onValueChange={v => setForm({ ...form, work_class: v })}>
              <SelectTrigger className={`border font-semibold ${WORK_CLASS_COLORS[wc] || ""}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_CLASS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tracking Type */}
          <div className="space-y-2">
            <Label>Tracking Type</Label>
            <Select value={trackingType} onValueChange={v => setForm({ ...form, tracking_type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRACKING_TYPE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only this metric will be used to calculate the trigger score.
            </p>
          </div>

          {/* Dynamic Interval Field */}
          <div className="space-y-1.5">
            <Label>{intervalCfg.label}</Label>
            <Input
              type="number"
              step={intervalCfg.step}
              min="0"
              value={form[intervalCfg.field]}
              onChange={e => setForm({ ...form, [intervalCfg.field]: e.target.value })}
              placeholder={intervalCfg.placeholder}
            />
          </div>

          {/* Due Soon % */}
          <div className="space-y-1.5">
            <Label className="text-xs">Due Soon Threshold (%)</Label>
            <Input
              type="number"
              step="1"
              min="0"
              max="100"
              value={form.due_soon_percent}
              onChange={e => setForm({ ...form, due_soon_percent: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Trigger Amber status when progress reaches this percentage of the interval.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}