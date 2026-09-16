import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 4, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          "w-full rounded-lg border border-white/10 bg-tiger-panel p-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-tiger-cyan/60 focus:ring-1 focus:ring-tiger-cyan/30",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
