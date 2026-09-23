"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = "typescript" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split("\n");

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-[#0d1117] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 text-xs">
        <span className="font-mono text-slate-400 lowercase">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors px-2 py-0.5 rounded hover:bg-slate-800"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-[11px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content with Line Numbers */}
      <div className="p-4 overflow-x-auto font-mono text-xs text-slate-200 leading-relaxed">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30">
                <td className="pr-4 text-right text-slate-400 select-none w-8 text-[11px]">
                  {idx + 1}
                </td>
                <td className="whitespace-pre">{line}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

