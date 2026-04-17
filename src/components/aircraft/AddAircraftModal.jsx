import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import MobileSelect from "@/components/shared/MobileSelect";

const CATEGORIES = ["Piston Single / Light Aircraft", "Turboprop", "Light Jet", "Midsize Jet", "Super Midsize / Heavy Jet", "High Turn Charter"];
const SEVERITIES = ["Light use", "Moderate use", "Heavy use", "Charter / high turn", "Harsh environment"];

export default function AddAircraftModal({ open, onOpenChange, onSave }) {
  const [form, setForm] = useState({ tail_number: "", owner_name: "", company_name: "", make: "", model: "", aircraft_category: "", severity_profile: "Moderate use", base_airport: "" });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave({ ...form, tail_number: form.tail_number.toUpperCase().trim(), orbit_status: "Green", orbit_score: 0, hours_since_orbit: 0, cycles_since_orbit: 0, days_since_orbit: 0, current_total_hours: 0, current_total_cycles: 0 });
    setForm({ tail_number: "", owner_name: "", company_name: "", make: "", model: "", aircraft_category: "", severity_profile: "Moderate use", base_airport: "" });
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add Aircraft</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 mt-2">
          <div className="col-span-2 space-y-1">
            <Label>Tail Number *</Label>
            <Input placeholder="N12345" value={form.tail_number} onChange={e => set("tail_number", e.target.value)} className="font-mono text-lg tracking-wider" required />
          </div>
          <div className="space-y-1"><Label>Owner Name</Label><Input placeholder="John Smith" value={form.owner_name} onChange={e => set("owner_name", e.target.value)} /></div>
          <div className="space-y-1"><Label>Company</Label><Input placeholder="Smith Corp" value={form.company_name} onChange={e => set("company_name", e.target.value)} /></div>
          <div className="space-y-1"><Label>Make</Label><Input placeholder="Cessna" value={form.make} onChange={e => set("make", e.target.value)} /></div>
          <div className="space-y-1"><Label>Model</Label><Input placeholder="Citation XLS" value={form.model} onChange={e => set("model", e.target.value)} /></div>
          <div className="col-span-2 space-y-1">
            <Label>Aircraft Category</Label>
            <MobileSelect
              value={form.aircraft_category}
              onValueChange={v => set("aircraft_category", v)}
              placeholder="Select category"
              options={CATEGORIES.map(c => ({ value: c, label: c }))}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Severity Profile</Label>
            <MobileSelect
              value={form.severity_profile}
              onValueChange={v => set("severity_profile", v)}
              placeholder="Select severity"
              options={SEVERITIES.map(s => ({ value: s, label: s }))}
            />
          </div>
          <div className="space-y-1"><Label>Base Airport</Label><Input placeholder="KORD" value={form.base_airport} onChange={e => set("base_airport", e.target.value)} /></div>
          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.tail_number || loading}>{loading ? "Adding..." : "Add Aircraft"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}