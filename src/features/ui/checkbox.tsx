import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
    checked?: boolean | "indeterminate";
  }
>(({ className, checked, style, ...props }, ref) => {
  const isIndeterminate = checked === "indeterminate";
  
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      checked={isIndeterminate ? false : checked}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        isIndeterminate && "bg-primary text-primary-foreground",
        className?.includes('checkbox-full-green') && checked === true && "data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600",
        className,
      )}
      style={style}
      {...props}
    >
      {isIndeterminate ? (
        <div className="flex items-center justify-center text-current">
          <Minus className="h-4 w-4" />
        </div>
      ) : (
        <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
          <Check className="h-4 w-4" />
        </CheckboxPrimitive.Indicator>
      )}
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
