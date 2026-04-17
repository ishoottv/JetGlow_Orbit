import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Pencil, Wrench, Calendar } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import AddAircraftToCustomerDialog from "../components/customers/AddAircraftToCustomerDialog";
import EditAircraftModal from "../components/aircraft/EditAircraftModal";
import EditCustomerDialog from "../components/customers/EditCustomerDialog";
import OrbitStatusBadge from "../components/shared/OrbitStatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CustomerDetail() {
  const { id } = useParams();
  const [addOpen, setAddOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState(null);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => base44.entities.Customer.filter({ id }),
  });

  const updateCustomerMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer updated");
    },
  });

  const { data: aircraft = [] } = useQuery({
    queryKey: ["customer-aircraft", id],
    queryFn: () => base44.entities.Aircraft.filter({ customer_id: id }),
  });

  // Fetch all maintenance events for this customer's aircraft
  const aircraftIds = React.useMemo(() => aircraft.map(a => a.id), [aircraft]);
  const { data: allEvents = [] } = useQuery({
    queryKey: ["customer-maintenance", id, aircraftIds.join(",")],
    queryFn: async () => {
      if (aircraftIds.length === 0) return [];
      const results = await Promise.all(
        aircraftIds.map(aid => base44.entities.MaintenanceEvent.filter({ aircraft_id: aid }))
      );
      return results.flat();
    },
    enabled: aircraftIds.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const getLastReset = (aircraftId) => {
    return allEvents
      .filter(e => e.aircraft_id === aircraftId && e.service_type === "RESET")
      .sort((a, b) => new Date(b.service_date) - new Date(a.service_date))[0] || null;
  };

  const getLastOrbit = (aircraftId) => {
    return allEvents
      .filter(e => e.aircraft_id === aircraftId && e.service_type === "ORBIT Visit")
      .sort((a, b) => new Date(b.service_date) - new Date(a.service_date))[0] || null;
  };

  const updateAircraftMutation = useMutation({
    mutationFn: (aircraftId) => base44.entities.Aircraft.update(aircraftId, { customer_id: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-aircraft", id] });
      queryClient.invalidateQueries({ queryKey: ["aircraft"] });
    },
  });

  const editAircraftMutation = useMutation({
    mutationFn: (data) => base44.entities.Aircraft.update(editingAircraft.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-aircraft", id] });
      queryClient.invalidateQueries({ queryKey: ["aircraft"] });
      toast.success("Aircraft updated");
      setEditingAircraft(null);
    },
  });

  const currentCustomer = customer?.[0];

  if (customerLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  }

  if (!currentCustomer) {
    return <div className="p-6 text-center text-muted-foreground">Customer not found</div>;
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link to="/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            {currentCustomer.logo_url && (
              <img src={currentCustomer.logo_url} alt={currentCustomer.name} className="h-16 w-16 object-contain rounded-lg border border-border" />
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">{currentCustomer.name}</h1>
              {currentCustomer.email && <p className="text-muted-foreground text-sm">{currentCustomer.email}</p>}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditCustomerOpen(true)}>
          <Pencil className="w-4 h-4" /> Edit
        </Button>
      </div>

      {currentCustomer.phone && (
        <div className="mb-6 text-sm text-muted-foreground">
          <p><span className="font-semibold">Phone:</span> {currentCustomer.phone}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Aircraft</h2>
        <Button onClick={() => setAddOpen(true)} className="gap-2" size="sm">
          <Plus className="w-4 h-4" /> Add Aircraft
        </Button>
      </div>
      {aircraft.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">No aircraft assigned to this customer</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Tail Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Make / Model</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">ORBIT Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Last ORBIT</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Last Reset</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {aircraft.map((ac) => {
                  const lastReset = getLastReset(ac.id);
                  const lastOrbit = getLastOrbit(ac.id);
                  return (
                  <tr key={ac.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => window.location.href = `/aircraft/${ac.id}`}>
                    <td className="px-4 py-3 font-semibold font-mono text-primary">
                      {ac.tail_number}
                    </td>
                    <td className="px-4 py-3 text-sm">{ac.make} {ac.model}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{ac.aircraft_category}</td>
                    <td className="px-4 py-3">
                      <OrbitStatusBadge status={ac.orbit_status || "Green"} />
                    </td>
                    {/* Last ORBIT Service */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Last ORBIT</p>
                          <p className="text-xs font-semibold text-foreground">
                            {lastOrbit ? format(new Date(lastOrbit.service_date), "MMM d, yyyy") : <span className="text-muted-foreground">—</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* Last Reset */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Last Reset</p>
                          <p className="text-xs font-semibold text-foreground">
                            {lastReset ? format(new Date(lastReset.service_date), "MMM d, yyyy") : <span className="text-muted-foreground">—</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                        {ac.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>View Details</Button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddAircraftToCustomerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        customerId={id}
        onAdd={(aircraftId) => updateAircraftMutation.mutateAsync(aircraftId)}
      />

      <EditAircraftModal
        open={!!editingAircraft}
        onOpenChange={(open) => !open && setEditingAircraft(null)}
        aircraft={editingAircraft}
        onSave={editAircraftMutation.mutateAsync}
        onDelete={() => {
          queryClient.invalidateQueries({ queryKey: ["customer-aircraft", id] });
          queryClient.invalidateQueries({ queryKey: ["aircraft"] });
        }}
      />

      <EditCustomerDialog
        open={editCustomerOpen}
        onOpenChange={setEditCustomerOpen}
        customer={currentCustomer}
        onSave={updateCustomerMutation.mutateAsync}
      />
    </div>
  );
}