import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile-optimized select using bottom sheet (drawer) on mobile, fallback to button on desktop
 */
export default function MobileSelect({ 
  value, 
  onValueChange, 
  placeholder = "Select option",
  options = [],
  triggerClassName = "",
  contentClassName = ""
}) {
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

  return (
    <>
      <Button
        variant="outline"
        className={cn("w-full justify-between", triggerClassName)}
        onClick={() => setOpen(true)}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {selectedLabel}
        </span>
        <span className="text-muted-foreground">▼</span>
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className={contentClassName}>
          <DrawerHeader>
            <DrawerTitle>{placeholder}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="h-64">
            <div className="space-y-1 p-4">
              {options.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors",
                    value === option.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="font-medium">{option.label}</span>
                  {value === option.value && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </>
  );
}