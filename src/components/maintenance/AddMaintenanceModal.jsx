import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function AddMaintenanceModal({ open, onOpenChange, aircraft, onSave }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    service_type: "",
    service_date: new Date().toISOString().split("T")[0],
    technician_name: "",
    total_hours_at_service: aircraft?.current_total_hours || 0,
    total_cycles_at_service: aircraft?.current_total_cycles || 0,
    services_performed: [],
    work_performed: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: rules = [] } = useQuery({
    queryKey: ["service-rules"],
    queryFn: () => base44.entities.ServiceTriggerRule.filter({ is_active: true }, "-trigger_priority"),
    enabled: open,
  });

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setError("");
  };

  const toggleService = (serviceCode) => {
    setForm(f => {
      const services = f.services_performed.includes(serviceCode)
        ? f.services_performed.filter(s => s !== serviceCode)
        : [...f.services_performed, serviceCode];
      return { ...f, services_performed: services };
    });
  };

  const handleSelectAll = () => {
    if (form.services_performed.length === rules.length) {
      setForm(f => ({ ...f, services_performed: [] }));
    } else {
      setForm(f => ({ ...f, services_performed: rules.map(r => r.service_code) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.service_type) {
      setError("Service Type is required");
      return;
    }
    if (form.services_performed.length === 0) {
      setError("At least one service must be selected");
      return;
    }
    if ((form.service_type === "ORBIT Visit" || form.service_type === "RESET") && !form.total_hours_at_service) {
      setError("Total Hours at Service is required for ORBIT Visit and RESET");
      return;
    }
    if ((form.service_type === "ORBIT Visit" || form.service_type === "RESET") && !form.total_cycles_at_service) {
      setError("Total Cycles at Service is required for ORBIT Visit and RESET");
      return;
    }

    setLoading(true);
    
    // Optimistic update
    const newEvent = {
      ...form,
      aircraft_id: aircraft.id,
      tail_number: aircraft.tail_number,
      total_hours_at_service: parseFloat(form.total_hours_at_service) || 0,
      total_cycles_at_service: parseInt(form.total_cycles_at_service) || 0,
      id: `temp-${Date.now()}`,
    };
    
    const previousMaint = queryClient.getQueryData(["maintenance", aircraft.id]);
    queryClient.setQueryData(["maintenance", aircraft.id], (old = []) => [...old, newEvent]);
    
    try {
      await onSave(newEvent);
      
      // Reset form
      setForm({
        service_type: "",
        service_date: new Date().toISOString().split("T")[0],
        technician_name: "",
        total_hours_at_service: aircraft?.current_total_hours || 0,
        total_cycles_at_service: aircraft?.current_total_cycles || 0,
        services_performed: [],
        work_performed: "",
        notes: "",
      });
      onOpenChange(false);
    } catch (err) {
      // Revert on error
      queryClient.setQueryData(["maintenance", aircraft.id], previousMaint);
      setError(err.message || "Failed to log maintenance");
    } finally {
      setLoading(false);
    }
  };

  const serviceTypes = ["ORBIT Visit", "RESET", "Add-On / Corrective", "Quick Touch"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Maintenance — {aircraft?.tail_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Service Type */}
          <div className="space-y-2">
            <Label>Service Type *</Label>
            <Select value={form.service_type} onValueChange={v => set("service_type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select service type..." />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map(st => (
                  <SelectItem key={st} value={st}>{st}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Services Performed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Services Performed *</Label>
              {rules.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-primary hover:underline"
                >
                  {form.services_performed.length === rules.length ? "Clear All" : "Select All"}
                </button>
              )}
            </div>
            <div className="bg-muted/30 rounded-lg border border-border p-4 space-y-2 max-h-48 overflow-y-auto">
              {rules.length === 0 ? (
                <p className="text-xs text-muted-foreground">No services available</p>
              ) : (
                rules.map(rule => (
                  <div key={rule.id} className="flex items-start gap-2">
                    <Checkbox
                      checked={form.services_performed.includes(rule.service_code)}
                      onCheckedChange={() => toggleService(rule.service_code)}
                      id={`service-${rule.id}`}
                    />
                    <label htmlFor={`service-${rule.id}`} className="flex-1 cursor-pointer hover:opacity-70">
                      <p className="font-semibold text-sm">{rule.service_name}</p>
                      <p className="text-xs text-muted-foreground">{rule.service_code}</p>
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Service Date *</Label>
              <Input type="date" value={form.service_date} onChange={e => set("service_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Technician Name</Label>
              <Input value={form.technician_name} onChange={e => set("technician_name", e.target.value)} placeholder="John Doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Total Hours at Service</Label>
              <Input type="number" step="0.1" value={form.total_hours_at_service} onChange={e => set("total_hours_at_service", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Cycles at Service</Label>
              <Input type="number" value={form.total_cycles_at_service} onChange={e => set("total_cycles_at_service", e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Work Performed / Notes</Label>
            <Textarea
              value={form.work_performed}
              onChange={e => set("work_performed", e.target.value)}
              placeholder="Describe any additional work or notes..."
              className="h-20"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Logging..." : "Log Maintenance"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}