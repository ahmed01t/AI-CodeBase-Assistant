"use client";

import React from "react";
import { Search, Loader2, CheckCircle2 } from "lucide-react";

interface ToolStatusPillProps {
  tool: string;
  query?: string;
  status: "running" | "completed";
  totalMatches?: number;
}

export function ToolStatusPill({
  tool,
  query,
  status,
  totalMatches,
}: ToolStatusPillProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/30 text-xs text-indigo-300 shadow-md shadow-indigo-500/10 my-2 animate-fade-in">
      {status === "running" ? (
        <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
      ) : (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      )}
      <span className="font-medium">
        {status === "running" ? (
          <>
            Searching codebase for <code className="text-indigo-200 bg-slate-800/80 px-1.5 py-0.5 rounded font-mono text-[11px]">{query || "relevant code"}</code>...
          </>
        ) : (
          <>
            Found {totalMatches !== undefined ? totalMatches : "matching"} code references
          </>
        )}
      </span>
    </div>
  );
}

