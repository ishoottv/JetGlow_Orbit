import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import MobileSelect from "@/components/shared/MobileSelect";
import { Checkbox } from "@/components/ui/checkbox";

export default function AddFlightModal({ open, onOpenChange, aircraftId, tailNumber, onSave }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    flight_date: new Date().toISOString().split("T")[0],
    departure_airport: "",
    arrival_airport: "",
    block_hours: "",
    flight_cycle: 1,
    count_toward_orbit: true,
    wear_factor: 1.0,
    flight_status: "landed",
    imported_source: "manual",
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Optimistic update
    const newFlight = {
      ...form,
      aircraft_id: aircraftId,
      tail_number: tailNumber,
      block_hours: parseFloat(form.block_hours) || 0,
      flight_cycle: parseInt(form.flight_cycle) || 1,
      wear_factor: parseFloat(form.wear_factor) || 1.0,
      id: `temp-${Date.now()}`,
    };
    
    const previousFlights = queryClient.getQueryData(["flights", aircraftId]);
    queryClient.setQueryData(["flights", aircraftId], (old = []) => [...old, newFlight]);
    
    try {
      await onSave(newFlight);
      onOpenChange(false);
    } catch (err) {
      // Revert on error
      queryClient.setQueryData(["flights", aircraftId], previousFlights);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Flight — {tailNumber}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1"><Label>Flight Date</Label><Input type="date" value={form.flight_date} onChange={e => set("flight_date", e.target.value)} /></div>
            <div className="space-y-1"><Label>Departure</Label><Input placeholder="KORD" value={form.departure_airport} onChange={e => set("departure_airport", e.target.value.toUpperCase())} className="font-mono" /></div>
            <div className="space-y-1"><Label>Arrival</Label><Input placeholder="KMIA" value={form.arrival_airport} onChange={e => set("arrival_airport", e.target.value.toUpperCase())} className="font-mono" /></div>
            <div className="space-y-1"><Label>Block Hours</Label><Input type="number" step="0.1" min="0" placeholder="2.5" value={form.block_hours} onChange={e => set("block_hours", e.target.value)} /></div>
            <div className="space-y-1"><Label>Wear Factor</Label>
              <MobileSelect
                value={String(form.wear_factor)}
                onValueChange={v => set("wear_factor", parseFloat(v))}
                placeholder="Wear Factor"
                options={[
                  { value: "1.0", label: "1.0 — Normal" },
                  { value: "0.5", label: "0.5 — Partial" },
                  { value: "0.0", label: "0.0 — Exclude" },
                ]}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Checkbox checked={form.count_toward_orbit} onCheckedChange={v => set("count_toward_orbit", v)} id="count-orbit" />
             <Label htmlFor="count-orbit" className="flex-1 cursor-pointer">
               Count Toward ORBIT
               <p className="text-xs text-muted-foreground font-normal">Include this flight in ORBIT calculations</p>
             </Label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.block_hours || loading}>{loading ? "Saving..." : "Add Flight"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}