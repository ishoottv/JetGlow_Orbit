import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AddAircraftToCustomerDialog({ open, onOpenChange, customerId, onAdd }) {
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: unclaimedAircraft = [] } = useQuery({
    queryKey: ["unclaimed-aircraft"],
    queryFn: () => base44.entities.Aircraft.filter({ customer_id: null }),
    enabled: open,
  });

  const handleAdd = async () => {
    if (!selectedAircraft) return;
    setLoading(true);
    try {
      await onAdd(selectedAircraft);
      toast.success("Aircraft assigned to customer");
      setSelectedAircraft("");
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to assign aircraft");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Aircraft to Customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Select Aircraft</Label>
            <Select value={selectedAircraft} onValueChange={setSelectedAircraft}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an aircraft..." />
              </SelectTrigger>
              <SelectContent>
                {unclaimedAircraft.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No unclaimed aircraft available</div>
                ) : (
                  unclaimedAircraft.map(ac => (
                    <SelectItem key={ac.id} value={ac.id}>
                      {ac.tail_number} — {ac.make} {ac.model}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!selectedAircraft || loading}>
              {loading ? "Adding..." : "Add Aircraft"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}