import React from "react";
import { cn } from "@/lib/utils";
import { getServiceStatusLabel } from "@/lib/serviceStatusLabels";

const config = {
  Green:  { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500",  border: "border-green-200" },
  Amber:  { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-500",  border: "border-amber-200" },
  Red:    { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500",    border: "border-red-200" },
};

export default function OrbitStatusBadge({ status, size = "sm" }) {
  const s = config[status] || config.Green;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 font-semibold border rounded-full",
      s.bg, s.text, s.border,
      size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3.5 py-1 text-sm"
    )}>
      <span className={cn("rounded-full flex-shrink-0", s.dot, size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")} />
      {getServiceStatusLabel(status || "Green")}
    </span>
  );
}
