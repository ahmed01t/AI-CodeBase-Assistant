"use client";

import React, { useState } from "react";
import { Webhook, ShieldCheck, Copy, Check, Terminal, ExternalLink } from "lucide-react";
import { Card, Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

export default function WebhooksPage() {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const webhookEndpoint = "http://localhost:5000/api/v1/webhooks/github";
  const sampleSecret = "your_github_webhook_secret_12345";

  const copyToClipboard = (text: string, isSecret = false) => {
    navigator.clipboard.writeText(text);
    if (isSecret) {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <div className="mb-6 sm:mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          GitHub Webhook Integration
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
          Keep your vector database in sync with real-time GitHub push events and HMAC-SHA256 signature verification.
        </p>
      </div>

      {/* Webhook Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Webhook className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Payload URL</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure this URL in your GitHub repository settings under <strong>Webhooks</strong>.
          </p>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs text-indigo-600 dark:text-indigo-300 truncate">
            <span className="truncate flex-1">{webhookEndpoint}</span>
            <button
              onClick={() => copyToClipboard(webhookEndpoint)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">HMAC SHA-256 Secret</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Set this secret in GitHub and add <code>GITHUB_WEBHOOK_SECRET</code> to your backend <code>.env</code>.
          </p>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs text-emerald-600 dark:text-emerald-300 truncate">
            <span className="truncate flex-1">{sampleSecret}</span>
            <button
              onClick={() => copyToClipboard(sampleSecret, true)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
            >
              {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </Card>
      </div>

      {/* Step by Step Guide */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          How Incremental Ingestion Works
        </h2>

        <Card className="p-5 sm:p-6 bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
              1
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Developer pushes code to GitHub</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                GitHub sends a <code>POST /api/v1/webhooks/github</code> request with an HMAC SHA-256 header.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
              2
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Instant Non-blocking Response</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                The Express backend verifies the cryptographic signature and returns <code>202 Accepted</code> in &lt;10ms.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
              3
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Incremental AST Re-indexing</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Only the touched files (added, modified, or deleted) are fetched, parsed with Tree-sitter, embedded via Gemini, and updated in pgvector.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

