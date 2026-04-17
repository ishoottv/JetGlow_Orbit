import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import EditServiceRuleModal from "../components/rules/EditServiceRuleModal";
import { toast } from "sonner";
import { getServiceFrequencyBucket, getServiceClassificationDetails } from "@/lib/serviceClassification";

const WORK_CLASS_COLORS = {
  monthly: "bg-primary/10 text-primary border-primary/20",
  quarterly: "bg-muted text-muted-foreground border-border",
  semiannual: "bg-teal-100 text-teal-700 border-teal-200",
  yearly: "bg-purple-100 text-purple-700 border-purple-200",
};

const CATEGORY_CONFIG = {
  monthly: {
    label: "Core Monthly Services",
    badge: "Every Visit",
    headerClass: "text-primary",
    dividerClass: "bg-primary/20",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
  },
  quarterly: {
    label: "Quarterly Condition Maintenance",
    badge: "Quarterly",
    headerClass: "text-muted-foreground",
    dividerClass: "bg-border",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
  semiannual: {
    label: "Semiannual Condition Maintenance",
    badge: "Biannual",
    headerClass: "text-teal-700",
    dividerClass: "bg-teal-200",
    badgeClass: "bg-teal-100 text-teal-700 border-teal-200",
  },
  yearly: {
    label: "Yearly Condition Maintenance",
    badge: "Annual",
    headerClass: "text-purple-700",
    dividerClass: "bg-purple-200",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-200",
  },
};

const CATEGORIES = ["monthly", "quarterly", "semiannual", "yearly"];

export default function RulesPage() {
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState(null);

  const { data: serviceRules = [], isLoading: serviceLoading } = useQuery({
    queryKey: ["service-rules"],
    queryFn: () => base44.entities.ServiceTriggerRule.list(),
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceTriggerRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-rules"] });
      toast.success("Service rule updated");
      setEditingRule(null);
    },
  });

  const handleSaveService = (updates) => {
    if (editingRule) {
      updateServiceMutation.mutate({ id: editingRule.id, data: updates });
    }
  };

  const rulesByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = serviceRules
      .filter(r => getServiceFrequencyBucket(r) === cat)
      .sort((a, b) => a.service_name.localeCompare(b.service_name));
    return acc;
  }, {});
  const uncategorized = serviceRules
    .filter(r => getServiceFrequencyBucket(r) === "other")
    .sort((a, b) => a.service_name.localeCompare(b.service_name));

  const renderRuleRow = (rule) => {
    const details = getServiceClassificationDetails(rule);
    const triggerTypeLabel =
      rule.tracking_type === "hours"
        ? "Flight Hours"
        : rule.tracking_type === "cycles"
          ? "Flight Cycles"
          : "Calendar Days";
    const triggerInterval =
      rule.tracking_type === "hours"
        ? (rule.hour_interval ? `${rule.hour_interval}h` : "—")
        : rule.tracking_type === "cycles"
          ? (rule.cycle_interval ? `${rule.cycle_interval}c` : "—")
          : (rule.day_interval ? `${rule.day_interval}d` : "—");

    return (
      <button
        key={rule.id}
        onClick={() => setEditingRule(rule)}
        className="w-full text-left bg-white border border-border rounded-lg px-4 py-3 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-black">{rule.service_name}</p>
            <p className="text-xs text-gray-500">{rule.service_code}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-700">
                Trigger: {triggerTypeLabel}
              </Badge>
              <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-700">
                Interval: {triggerInterval}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {details.reasons.map((reason) => (
                <Badge key={reason} variant="outline" className="text-[10px] border-slate-300 text-slate-600">
                  {reason}
                </Badge>
              ))}
              {rule.always_evaluate && (
                <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700">
                  always_evaluate
                </Badge>
              )}
              {details.notes.map((note) => (
                <Badge key={note} variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                  audit note
                </Badge>
              ))}
            </div>
            {details.notes.length > 0 && (
              <p className="text-[11px] text-amber-700 mt-2">{details.notes[0]}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className="text-xs flex-shrink-0 border text-muted-foreground">
                {rule.tracking_type || "days"}
              </Badge>
              <Badge className={`text-xs flex-shrink-0 border ${WORK_CLASS_COLORS[details.bucket] || ""}`}>
                {details.bucket}
              </Badge>
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Services</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure ORBIT service intervals and trigger rules</p>
        </div>
      </div>

      {serviceLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-8">
          {CATEGORIES.map(cat => {
            const rules = rulesByCategory[cat];
            if (rules.length === 0) return null;
            const cfg = CATEGORY_CONFIG[cat];
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-bold uppercase tracking-wide ${cfg.headerClass}`}>{cfg.label}</span>
                  <div className={`flex-1 h-px ${cfg.dividerClass}`} />
                  <Badge className={`text-xs border ${cfg.badgeClass}`}>{cfg.badge}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {rules.map(renderRuleRow)}
                </div>
              </div>
            );
          })}

          {uncategorized.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Uncategorized</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-2">
                {uncategorized.map(renderRuleRow)}
              </div>
            </div>
          )}

          {serviceRules.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <Wrench className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold">No service rules found</p>
            </div>
          )}
        </div>
      )}

      <EditServiceRuleModal
        open={!!editingRule}
        onOpenChange={(open) => { if (!open) setEditingRule(null); }}
        rule={editingRule}
        onSave={handleSaveService}
        saving={updateServiceMutation.isPending}
      />
    </div>
  );
}
