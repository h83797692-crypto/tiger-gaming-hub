import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          // h-11 (44px) keeps every field tappable on a 375px viewport.
          "h-11 w-full rounded-lg border border-white/10 bg-tiger-panel px-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-tiger-cyan/60 focus:ring-1 focus:ring-tiger-cyan/30",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
