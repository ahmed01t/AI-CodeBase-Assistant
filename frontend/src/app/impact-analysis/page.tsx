"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, FileCode2, GitBranch, ShieldCheck } from "lucide-react";
import { useWorkspace } from "../../context/workspace-context";
import { api } from "../../lib/api-client";
import { Button } from "../../components/ui/button";
import { Badge, Card } from "../../components/ui/badge";

type Evidence = {
  kind: "definition" | "caller" | "import" | "route" | "test" | "database";
  filePath: string;
  startLine: number;
  endLine: number;
  message: string;
  revision: string;
};

type Report = {
  target: string;
  risk: "low" | "medium" | "high";
  confidence: "verified" | "partial" | "unknown";
  summary: string;
  evidence: Evidence[];
  affectedFiles: string[];
  verificationChecklist: string[];
  indexedFiles: number;
};

const riskVariant = { low: "success", medium: "warning", high: "destructive" } as const;
const evidenceLabels: Record<Evidence["kind"], string> = {
  definition: "Original code",
  caller: "May be affected",
  import: "Connected code",
  route: "App feature",
  test: "Automated check",
  database: "Saved data",
};

const riskExplanation: Record<Report["risk"], string> = {
  low: "Small change: we found little evidence that other parts depend on this.",
  medium: "Take care: other parts of the app or saved data may be involved.",
  high: "Important: several parts of the app may be affected. Test carefully before publishing.",
};

export default function ImpactAnalysisPage() {
  const { activeRepo } = useWorkspace();
  const [target, setTarget] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze(event: React.FormEvent) {
    event.preventDefault();
    if (!activeRepo || !target.trim()) return;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      setReport(await api.analyzeImpact(activeRepo.id, target.trim()));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Unable to analyze impact.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100">
      <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2"><GitBranch className="w-5 h-5 text-indigo-500" /><h1 className="text-lg sm:text-xl font-bold">Evidence-backed Change Impact</h1></div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">See what parts of your app may be affected before you change something. Each result shows the file and line that supports it.</p>
      </div>

      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs mb-6">
        <form onSubmit={analyze} className="flex flex-col sm:flex-row gap-2">
          <input value={target} onChange={(event) => setTarget(event.target.value)} disabled={!activeRepo}
            placeholder={activeRepo ? "What are you changing? (for example: createAlert)" : "Select and sync a repository first"}
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50" />
          <Button type="submit" loading={loading} disabled={!activeRepo || !target.trim()} className="bg-indigo-600 hover:bg-indigo-500">Analyze impact</Button>
        </form>
        {activeRepo && <p className="mt-3 text-[11px] text-slate-500">Repository: <span className="font-medium text-slate-700 dark:text-slate-300">{activeRepo.owner}/{activeRepo.name}</span></p>}
        {error && <p className="mt-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </Card>

      {report && <div className="space-y-5 max-w-5xl">
        <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 mb-3"><h2 className="font-semibold">{report.target}</h2><Badge variant={riskVariant[report.risk]}>Change risk: {report.risk}</Badge><Badge variant={report.confidence === "verified" ? "success" : "warning"}>{report.confidence === "verified" ? "Confirmed" : report.confidence === "partial" ? "Partly confirmed" : "Not confirmed"}</Badge></div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{report.summary}</p>
          <p className="text-xs text-slate-500 mt-2">{riskExplanation[report.risk]}</p>
          <p className="text-[11px] text-slate-500 mt-3">Based on {report.indexedFiles} synced files. Each result comes from the latest saved version of that file.</p>
        </Card>

        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-1"><FileCode2 className="w-4 h-4 text-indigo-500" /> What may be affected ({report.evidence.length})</h2>
            <p className="text-[11px] text-slate-500 mb-4">These are the places to review. The file name and number tell a developer exactly where to look.</p>
            <div className="space-y-2">{report.evidence.length ? report.evidence.map((item, index) => <div key={`${item.filePath}-${item.startLine}-${index}`} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs"><div className="flex flex-wrap items-center gap-2 mb-1"><Badge variant="default">{evidenceLabels[item.kind]}</Badge><span className="font-mono text-slate-700 dark:text-slate-300">{item.filePath}:{item.startLine}{item.endLine !== item.startLine ? `-${item.endLine}` : ""}</span></div><p className="text-slate-600 dark:text-slate-400">{item.message}</p></div>) : <p className="text-xs text-slate-500">We could not find a confirmed match for this item.</p>}</div>
          </Card>
          <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><ShieldCheck className="w-4 h-4 text-indigo-500" /> Before you publish</h2>
            <ul className="space-y-3">{report.verificationChecklist.map((item) => <li key={item} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400"><CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />{item}</li>)}</ul>
          </Card>
        </div>
        {report.risk === "high" && <div className="flex gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3"><AlertTriangle className="w-4 h-4 shrink-0" />This is a warning, not a guarantee. The tool found several connected areas, but a developer should still confirm the final impact.</div>}
      </div>}
    </div>
  );
}
