import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, XCircle, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import PageHeader from "../components/shared/PageHeader";
import { toast } from "sonner";

const typeColors = {
  "Overdue": "bg-red-50 border-red-200 text-red-700",
  "Due Soon": "bg-amber-50 border-amber-200 text-amber-700",
  "Recommended Service": "bg-blue-50 border-blue-200 text-blue-700",
  "Days Threshold": "bg-purple-50 border-purple-200 text-purple-700",
};

export default function AlertsPage() {
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => base44.entities.Alert.list("-created_date"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Alert.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const active = alerts.filter(a => a.alert_status === "active");
  const dismissed = alerts.filter(a => a.alert_status !== "active");

  const dismiss = (id) => {
    updateMutation.mutate({ id, data: { alert_status: "dismissed" } });
    toast.success("Alert dismissed");
  };

  const resolve = (id) => {
    updateMutation.mutate({ id, data: { alert_status: "resolved" } });
    toast.success("Alert resolved");
  };

  const AlertCard = ({ alert }) => (
    <div className={`border rounded-2xl p-5 ${typeColors[alert.alert_type] || "bg-card border-border"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black font-mono text-sm">{alert.tail_number}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/60">{alert.alert_type}</span>
            </div>
            <p className="text-sm mt-1">{alert.alert_message}</p>
            {alert.due_date && <p className="text-xs mt-1 opacity-70">Due: {alert.due_date}</p>}
          </div>
        </div>
        {alert.alert_status === "active" && (
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => dismiss(alert.id)}>Dismiss</Button>
            <Button size="sm" className="text-xs h-7" onClick={() => resolve(alert.id)}>Resolve</Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Alerts"
        subtitle={`${active.length} active alerts`}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="font-bold text-base mb-3">Active ({active.length})</h2>
            {active.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <p className="font-semibold">No active alerts</p>
                <p className="text-sm text-muted-foreground">All aircraft are within service thresholds</p>
              </div>
            ) : (
              <div className="space-y-3">
                {active.map(a => <AlertCard key={a.id} alert={a} />)}
              </div>
            )}
          </div>

          {dismissed.length > 0 && (
            <div>
              <h2 className="font-bold text-base mb-3 text-muted-foreground">Dismissed / Resolved ({dismissed.length})</h2>
              <div className="space-y-2 opacity-60">
                {dismissed.map(a => <AlertCard key={a.id} alert={a} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}