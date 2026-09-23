import React from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-all",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
