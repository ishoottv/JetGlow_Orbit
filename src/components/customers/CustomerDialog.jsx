import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

export default function CustomerDialog({ open, onOpenChange, customer, onSave }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    tail_numbers: [],
    notes: "",
  });
  const [currentTail, setCurrentTail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        company: customer.company || "",
        tail_numbers: customer.tail_numbers || [],
        notes: customer.notes || "",
      });
    } else {
      setForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        tail_numbers: [],
        notes: "",
      });
    }
    setCurrentTail("");
  }, [customer, open]);

  const handleAddTail = () => {
    if (currentTail.trim() && !form.tail_numbers.includes(currentTail.toUpperCase())) {
      setForm(f => ({
        ...f,
        tail_numbers: [...f.tail_numbers, currentTail.toUpperCase().trim()],
      }));
      setCurrentTail("");
    }
  };

  const handleRemoveTail = (tail) => {
    setForm(f => ({
      ...f,
      tail_numbers: f.tail_numbers.filter(t => t !== tail),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? "Edit Customer" : "New Customer"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Customer name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))}
                  placeholder="Company name"
                />
              </div>
            </div>
          </div>

          {/* Aircraft */}
          <div className="space-y-2">
            <Label>Aircraft Tail Numbers</Label>
            <div className="flex gap-2">
              <Input
                value={currentTail}
                onChange={(e) => setCurrentTail(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleAddTail()}
                placeholder="e.g. N12345"
                className="font-mono"
              />
              <Button type="button" onClick={handleAddTail} variant="outline">
                Add
              </Button>
            </div>
            {form.tail_numbers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {form.tail_numbers.map((tail) => (
                  <div key={tail} className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {tail}
                    <button
                      type="button"
                      onClick={() => handleRemoveTail(tail)}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes..."
              className="h-20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || saving}>
              {saving ? "Saving..." : "Save Customer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}