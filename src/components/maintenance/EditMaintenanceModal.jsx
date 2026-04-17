import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { parseLocalDate } from "@/lib/dateUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const SERVICE_TYPES = ["ORBIT Visit", "RESET", "Add-On / Corrective", "Quick Touch"];

export default function EditMaintenanceModal({ open, onOpenChange, event, onSave, onDelete }) {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: rules = [] } = useQuery({
    queryKey: ["service-rules"],
    queryFn: () => base44.entities.ServiceTriggerRule.filter({ is_active: true }, "-trigger_priority"),
    enabled: open,
  });

  useEffect(() => {
    if (event) {
      // Ensure date is in local format, not UTC
      const formData = { ...event };
      if (event.service_date) {
        const d = parseLocalDate(event.service_date);
        formData.service_date = d.toISOString().split('T')[0];
      }
      setForm(formData);
    }
  }, [event]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleService = (serviceCode) => {
    setForm(f => {
      const services = (f.services_performed || []).includes(serviceCode)
        ? f.services_performed.filter(s => s !== serviceCode)
        : [...(f.services_performed || []), serviceCode];
      return { ...f, services_performed: services };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || "Failed to update maintenance event");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this maintenance event? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await onDelete(event.id);
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Maintenance Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-6 mt-4">
          {/* Service Type */}
          <div className="space-y-2">
            <Label>Service Type</Label>
            <Select value={form.service_type || ""} onValueChange={v => set("service_type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select service type..." />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map(st => (
                  <SelectItem key={st} value={st}>{st}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Services Performed */}
          <div className="space-y-3">
            <Label>Services Performed</Label>
            <div className="bg-muted/30 rounded-lg border border-border p-4 space-y-2 max-h-48 overflow-y-auto">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-start gap-2">
                  <Checkbox
                    checked={(form.services_performed || []).includes(rule.service_code)}
                    onCheckedChange={() => toggleService(rule.service_code)}
                    id={`edit-service-${rule.id}`}
                  />
                  <label htmlFor={`edit-service-${rule.id}`} className="flex-1 cursor-pointer hover:opacity-70">
                    <p className="font-semibold text-sm">{rule.service_name}</p>
                    <p className="text-xs text-muted-foreground">{rule.service_code}</p>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Service Date</Label>
              <Input type="date" value={form.service_date || ""} onChange={e => set("service_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Technician Name</Label>
              <Input value={form.technician_name || ""} onChange={e => set("technician_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Hours at Service</Label>
              <Input type="number" step="0.1" value={form.total_hours_at_service || ""} onChange={e => set("total_hours_at_service", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Cycles at Service</Label>
              <Input type="number" value={form.total_cycles_at_service || ""} onChange={e => set("total_cycles_at_service", parseInt(e.target.value) || 0)} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Work Performed / Notes</Label>
            <Textarea
              value={form.work_performed || ""}
              onChange={e => set("work_performed", e.target.value)}
              className="h-20"
            />
          </div>

          <div className="flex justify-between gap-3 pt-2">
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}