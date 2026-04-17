import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Upload, X } from "lucide-react";
import MobileSelect from "@/components/shared/MobileSelect";
import { toast } from "sonner";

const CATEGORIES = [
  "Piston Single / Light Aircraft",
  "Turboprop",
  "Light Jet",
  "Midsize Jet",
  "Super Midsize / Heavy Jet",
  "High Turn Charter",
];

const SEVERITY_PROFILES = [
  "Light use",
  "Moderate use",
  "Heavy use",
  "Charter / high turn",
  "Harsh environment",
];

const STATUSES = ["active", "inactive", "grounded"];

export default function EditAircraftModal({ open, onOpenChange, aircraft, onSave, onDelete }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("photo_url", file_url);
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  useEffect(() => {
    if (aircraft) setForm({ ...aircraft });
  }, [aircraft]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete aircraft ${aircraft?.tail_number}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await base44.entities.Aircraft.delete(aircraft.id);
      toast.success("Aircraft deleted");
      onOpenChange(false);
      if (onDelete) onDelete();
    } catch (err) {
      toast.error("Failed to delete aircraft");
    } finally {
      setDeleting(false);
    }
  };

  const field = (label, key, type = "text", placeholder = "") => (
    <div className="space-y-1.5" key={key}>
      <Label>{label}</Label>
      <Input
        type={type}
        value={form[key] || ""}
        onChange={e => set(key, type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Aircraft — {aircraft?.tail_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Identity */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Identity</p>
            <div className="grid grid-cols-2 gap-4">
              {field("Tail Number", "tail_number")}
              {field("Make", "make")}
              {field("Model", "model")}
              {field("Base Airport", "base_airport", "text", "KXXX")}
            </div>
          </div>

          {/* Ownership */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ownership</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <MobileSelect
                  value={form.customer_id || ""}
                  onValueChange={v => set("customer_id", v)}
                  placeholder="Select customer"
                  options={customers.map(c => ({ value: c.id, label: c.name }))}
                />
              </div>
              <div className="flex items-end pb-0.5">
                <button
                  onClick={() => set("orbit_plan", form.orbit_plan ? "" : "Standard")}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-70"
                >
                  <Checkbox checked={!!form.orbit_plan} />
                  <Label className="cursor-pointer mb-0">Orbit Plan Subscription</Label>
                </button>
              </div>
            </div>
          </div>

          {/* Classification */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Classification</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Aircraft Category</Label>
                <MobileSelect
                  value={form.aircraft_category || ""}
                  onValueChange={v => set("aircraft_category", v)}
                  placeholder="Select category"
                  options={CATEGORIES.map(c => ({ value: c, label: c }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Severity Profile</Label>
                <MobileSelect
                  value={form.severity_profile || ""}
                  onValueChange={v => set("severity_profile", v)}
                  placeholder="Select severity"
                  options={SEVERITY_PROFILES.map(s => ({ value: s, label: s }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <MobileSelect
                  value={form.status || "active"}
                  onValueChange={v => set("status", v)}
                  placeholder="Select status"
                  options={STATUSES.map(s => ({ value: s, label: s }))}
                />
              </div>
            </div>
          </div>

          {/* ORBIT Tracking */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">ORBIT Tracking</p>
            <div className="grid grid-cols-2 gap-4">
              {field("Last ORBIT Service Date", "last_orbit_service_date", "date")}
              {field("Hours at Last ORBIT", "last_orbit_total_hours", "number")}
              {field("Cycles at Last ORBIT", "last_orbit_total_cycles", "number")}
              {field("Current Total Hours", "current_total_hours", "number")}
              {field("Current Total Cycles", "current_total_cycles", "number")}
            </div>
          </div>

          {/* Photo */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Aircraft Photo</p>
            {form.photo_url ? (
              <div className="relative inline-block">
                <img src={form.photo_url} alt="Aircraft" className="w-full h-48 object-cover rounded-lg border border-border" />
                <button
                  type="button"
                  onClick={() => set("photo_url", "")}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Click to upload photo"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes || ""}
              onChange={e => set("notes", e.target.value)}
              placeholder="Any additional notes..."
              className="h-20"
            />
          </div>

          <div className="flex justify-between gap-3 pt-2">
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Delete Aircraft
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}