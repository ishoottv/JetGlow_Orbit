import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import MobileSelect from "@/components/shared/MobileSelect";
import { Plane } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function AddAircraftDialog({ open, onOpenChange, onAdd, onFlightsFetched }) {
  const [tailNumber, setTailNumber] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tailNumber.trim()) return;
    setLoading(true);
    try {
      await onAdd({
        tail_number: tailNumber.toUpperCase().trim(),
        customer_id: customerId,
        status: "active",
      });
      toast.success(`Aircraft ${tailNumber.toUpperCase().trim()} added`);
      setTailNumber("");
      setCustomerId("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || "Failed to add aircraft");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-primary" />
            Add Aircraft
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="tail">Tail Number</Label>
            <Input
              id="tail"
              placeholder="e.g. N12345"
              value={tailNumber}
              onChange={(e) => setTailNumber(e.target.value)}
              className="text-lg font-mono tracking-wider"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Flight history will be fetched automatically from FlightAware.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer">Customer</Label>
            <MobileSelect
              value={customerId}
              onValueChange={setCustomerId}
              placeholder="Select customer (optional)"
              options={customers.map(c => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!tailNumber.trim() || loading}>
              {loading ? "Adding & Fetching..." : "Add Aircraft"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}