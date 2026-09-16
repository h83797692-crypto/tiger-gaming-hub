import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-xl px-6 py-3 font-black uppercase tracking-wider transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tiger-cyan/60 hover:scale-105",
          variant === "primary" &&
            "bg-gradient-to-r from-[#00F0FF] to-[#00A3FF] text-[#07090E] shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:shadow-[0_0_35px_rgba(0,240,255,0.7)]",
          variant === "outline" &&
            "border border-tiger-cyan/45 text-tiger-cyan hover:bg-tiger-cyan/10",
          variant === "ghost" && "text-white/70 hover:bg-white/5 hover:text-white",
          variant === "danger" && "border border-tiger-live/50 text-tiger-live hover:bg-tiger-live/10",
          // Touch targets stay >=44px at every size for the mobile admin pass.
          size === "sm" && "h-11 px-4 text-xs",
          size === "md" && "h-11 px-5 text-sm",
          size === "lg" && "h-12 w-full px-7 text-base sm:w-auto",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
