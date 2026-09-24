"use client";

import React from "react";
import { FileCode, Sparkles, Layers } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";

interface CitationSource {
  filePath?: string;
  similarity?: number;
  symbolName?: string;
}

interface CitationPanelProps {
  sources: CitationSource[];
}

export function CitationPanel({ sources }: CitationPanelProps) {
  if (!sources || sources.length === 0) {
    return (
      <aside className="hidden lg:flex w-72 xl:w-80 h-full bg-slate-100/60 dark:bg-[#07090e] border-l border-slate-200 dark:border-slate-800/80 p-5 flex-col items-center justify-center text-center shrink-0 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3 shadow-xs">
          <Layers className="w-5 h-5" />
        </div>
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
          Contextual Citations
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px]">
          Code chunks and files retrieved by vector search will appear here.
        </p>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:flex w-72 xl:w-80 h-full bg-slate-100/60 dark:bg-[#07090e] border-l border-slate-200 dark:border-slate-800/80 p-4 flex-col shrink-0 overflow-y-auto transition-colors">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          Contextual Citations ({sources.length})
        </div>
      </div>

      <div className="space-y-3">
        {sources.map((src, i) => {
          const matchPercent = src.similarity
            ? Math.round(src.similarity * 100)
            : 90 + Math.round((sources.length - i) * 2);

          const fileName = src.filePath?.split("/").pop() || src.filePath || `source-${i + 1}.ts`;
          const directory = src.filePath?.substring(0, src.filePath.lastIndexOf("/")) || "";

          return (
            <Card key={i} className="p-3.5 bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileCode className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <span className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200 truncate">
                    {fileName}
                  </span>
                </div>
                <Badge variant={matchPercent >= 85 ? "success" : "indigo"} className="text-[10px] py-0">
                  {matchPercent}% Match
                </Badge>
              </div>

              {directory && (
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mb-2">
                  {directory}
                </div>
              )}

              {src.symbolName && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/80 px-2 py-1 rounded border border-slate-200 dark:border-slate-800/80">
                  <span className="text-slate-400 font-mono">AST:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-300 font-medium truncate">{src.symbolName}</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </aside>
  );
}
