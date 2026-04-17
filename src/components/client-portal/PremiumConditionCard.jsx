import React from "react";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const statusConfig = {
  green: {
    title: "Excellent Condition",
    message: "Your aircraft is currently in excellent condition and is being maintained within its recommended care window.",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  amber: {
    title: "Well Maintained",
    message: "Your aircraft is being maintained within its recommended care window. An upcoming service is approaching.",
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  red: {
    title: "Attention Recommended",
    message: "Service is recommended to maintain optimal appearance and condition. Please schedule at your earliest convenience.",
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
};

export default function PremiumConditionCard({ 
  orbitStatus = "Green",
  lastServiceDate = null,
  aircraftName = "Your Aircraft"
}) {
  const status = orbitStatus === "Red" ? "red" : orbitStatus === "Amber" ? "amber" : "green";
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn("rounded-2xl border-2 p-8 shadow-sm", config.bgColor, config.borderColor)}>
      <div className="flex items-start gap-4">
        <Icon className={cn("w-8 h-8 flex-shrink-0 mt-1", config.color)} />
        <div className="flex-1 space-y-3">
          <div>
            <h3 className={cn("text-xl font-bold", config.color)}>{config.title}</h3>
            <p className="text-sm text-slate-700 mt-2 leading-relaxed">{config.message}</p>
          </div>
          {lastServiceDate && (
            <div className="pt-2 border-t border-slate-300/50">
              <p className="text-xs text-slate-600 font-medium">
                Last Complete Service: <span className="font-semibold">{format(new Date(lastServiceDate), "MMMM d, yyyy")}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}