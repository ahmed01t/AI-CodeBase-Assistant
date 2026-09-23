import React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

    const variantStyles = {
      primary:
        "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 active:scale-[0.98]",
      secondary:
        "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/60 dark:bg-slate-800 dark:hover:bg-slate-750",
      outline:
        "border border-slate-700 text-slate-300 hover:bg-slate-800/60 hover:text-white dark:border-slate-700/80 dark:text-slate-300 dark:hover:bg-slate-800",
      ghost:
        "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 dark:hover:bg-slate-800/60",
      danger:
        "bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-600/30",
    };

    const sizeStyles = {
      sm: "text-xs px-2.5 py-1.5 gap-1.5",
      md: "text-sm px-3.5 py-2 gap-2",
      lg: "text-base px-5 py-2.5 gap-2.5",
      icon: "p-2 h-9 w-9",
    };

    return (
      <button
        ref={ref}
        suppressHydrationWarning
        disabled={disabled || loading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

