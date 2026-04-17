import React from "react";
import { cn } from "@/lib/utils";

export default function OrbitScoreBar({ score = 0, showLabel = true }) {
  const color = score >= 100 ? "bg-red-500" : score >= 80 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>JetGlow Condition Index</span>
          <span className="font-semibold">{score}/100</span>
        </div>
      )}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={cn("h-2 rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}