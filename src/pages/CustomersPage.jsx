import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2, RotateCw } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "../components/shared/PageHeader";
import CustomerDialog from "../components/customers/CustomerDialog";
import PullToRefreshWrapper from "../components/shared/PullToRefreshWrapper";
import { toast } from "sonner";

export default function CustomersPage() {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer added");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted");
    },
  });

  const handleSave = async (data) => {
    if (editingCustomer) {
      await updateMutation.mutateAsync({ id: editingCustomer.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setOpenDialog(false);
    setEditingCustomer(null);
  };

  return (
    <PullToRefreshWrapper onRefresh={() => queryClient.refetchQueries({ queryKey: ["customers"] })}>
      <div className="p-6 md:p-8">
      <PageHeader
        title="Customers"
        subtitle="Manage customer profiles and their aircraft"
        actions={
          <Button
            onClick={() => {
              setEditingCustomer(null);
              setOpenDialog(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        }
      />

      <CustomerDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        customer={editingCustomer}
        onSave={handleSave}
      />

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : customers.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">No customers yet</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Aircraft</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold">
                      <Link to={`/customers/${customer.id}`} className="text-primary hover:underline">
                        {customer.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{customer.email || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{customer.company || "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {customer.tail_numbers?.length > 0
                        ? customer.tail_numbers.join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCustomer(customer);
                            setOpenDialog(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(customer.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </PullToRefreshWrapper>
  );
}