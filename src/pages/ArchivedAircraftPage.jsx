import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArchiveRestore, Trash2, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "../components/shared/PageHeader";
import { toast } from "sonner";

export default function ArchivedAircraftPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: aircraft = [], isLoading } = useQuery({
    queryKey: ["aircraft-archived"],
    queryFn: () => base44.entities.Aircraft.filter({ status: "archived" }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => base44.entities.Aircraft.update(id, { status: "active" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aircraft-archived"] });
      queryClient.invalidateQueries({ queryKey: ["aircraft"] });
      toast.success("Aircraft restored to active");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Aircraft.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aircraft-archived"] });
      toast.success("Aircraft permanently deleted");
    },
  });

  const handleRestore = (ac) => restoreMutation.mutate(ac.id);

  const handleDelete = (ac) => {
    if (confirm(`Permanently delete ${ac.tail_number}? This cannot be undone.`)) {
      deleteMutation.mutate(ac.id);
    }
  };

  const filtered = aircraft.filter(ac => {
    const s = search.toLowerCase();
    return !search ||
      ac.tail_number?.toLowerCase().includes(s) ||
      ac.owner_name?.toLowerCase().includes(s) ||
      ac.make?.toLowerCase().includes(s) ||
      ac.model?.toLowerCase().includes(s);
  });

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/aircraft"><Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Archived Aircraft</h1>
          <p className="text-sm text-muted-foreground">{aircraft.length} archived aircraft</p>
        </div>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {["Tail #", "Owner / Company", "Make / Model", "Category", "Base Airport", "Notes", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No archived aircraft</td></tr>
              )}
              {filtered.map(ac => (
                <tr key={ac.id} className="hover:bg-muted/20 transition-colors opacity-75">
                  <td className="px-4 py-3">
                    <Link to={`/aircraft/${ac.id}`} className="font-black font-mono text-primary hover:underline text-sm">{ac.tail_number}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-xs">{ac.owner_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{ac.company_name}</p>
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{ac.make} {ac.model}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{ac.aircraft_category || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{ac.base_airport || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{ac.notes || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestore(ac)}
                        title="Restore"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ArchiveRestore className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(ac)}
                        title="Delete permanently"
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}