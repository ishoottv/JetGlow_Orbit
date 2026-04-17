import React from "react";
import { cn } from "@/lib/utils";

export default function StatCard({ title, value, icon: Icon, trend, className }) {
  return (
    <div className={cn(
      "bg-card rounded-2xl border border-border p-6 relative overflow-hidden group hover:shadow-lg transition-shadow duration-300",
      className
    )}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2 tracking-tight">{value}</p>
          {trend && (
            <p className="text-xs text-muted-foreground mt-2">{trend}</p>
          )}
        </div>
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </div>
  );
}