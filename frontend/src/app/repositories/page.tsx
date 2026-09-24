"use client";

import React, { useState } from "react";
import { FolderGit2, RefreshCw, Plus, CheckCircle2, GitBranch, Layers, ExternalLink, Sparkles } from "lucide-react";
import { useWorkspace } from "../../context/workspace-context";
import { api } from "../../lib/api-client";
import { Button } from "../../components/ui/button";
import { Card, Badge } from "../../components/ui/badge";
import { formatDate } from "../../lib/utils";

export default function RepositoriesPage() {
  const { repositories, activeProject, refreshWorkspace } = useWorkspace();
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState("");
  const [newRepoName, setNewRepoName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const handleSync = async (repoId: string) => {
    setSyncingRepoId(repoId);
    setSyncStatusMsg("Initiating AST chunking and vector embedding generation...");
    try {
      await api.syncRepository(repoId, "main");
      setSyncStatusMsg("Repository synchronization completed successfully!");
      await refreshWorkspace();
    } catch (err: any) {
      setSyncStatusMsg(`Sync failed: ${err.message}`);
    } finally {
      setTimeout(() => setSyncStatusMsg(null), 3000);
      setSyncingRepoId(null);
    }
  };

  const handleAddRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName || !activeProject) return;
    setIsAdding(true);
    try {
      const parts = newRepoUrl.split("/").filter(Boolean);
      const owner = parts.length >= 2 ? parts[parts.length - 2] : "user";
      const cleanName = newRepoName.trim();

      await api.createRepository({
        projectId: activeProject.id,
        provider: "github",
        externalId: `${owner}-${cleanName}`,
        owner: owner,
        name: cleanName,
        url: newRepoUrl || `https://github.com/${owner}/${cleanName}`,
      });
      setShowAddModal(false);
      setNewRepoName("");
      setNewRepoUrl("");
      await refreshWorkspace();
    } catch (err: any) {
      alert(`Error creating repository: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const totalChunks = repositories.reduce((acc, r) => acc + (r.totalChunks || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Repositories & Ingestion
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Connect GitHub repositories, run Tree-sitter AST chunking, and synchronize pgvector embeddings.
          </p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          size="sm"
          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Connect Repository</span>
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-4 sm:p-5 bg-white/70 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{repositories.length}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Connected Repositories</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 bg-white/70 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalChunks > 0 ? totalChunks.toLocaleString() : "0"}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">AST Chunks Indexed</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 bg-white/70 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">768 Dim</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gemini pgvector</div>
            </div>
          </div>
        </Card>
      </div>

      {syncStatusMsg && (
        <div className="mb-6 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-600 dark:text-indigo-300 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* Repositories List */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Connected Repositories ({repositories.length})
        </h2>

        {repositories.length === 0 ? (
          <Card className="p-8 text-center bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
            <FolderGit2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No repositories connected yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Click &quot;Connect Repository&quot; to link your GitHub repository and begin automatic code indexing.
            </p>
          </Card>
        ) : (
          repositories.map((repo) => {
            const isSyncing = syncingRepoId === repo.id;

            return (
              <Card
                key={repo.id}
                className="p-4 sm:p-5 bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{repo.owner} / {repo.name}</span>
                    <Badge variant={repo.status === "synced" ? "success" : "warning"} className="text-[10px]">
                      {repo.status === "synced" ? "● Synced" : "● Ingesting"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                      {repo.defaultBranch || "main"}
                    </span>
                    <span>•</span>
                    <span>{repo.totalChunks ? `${repo.totalChunks} chunks` : "Chunks ready"}</span>
                    <span>•</span>
                    <span>Synced {formatDate(repo.lastSyncedAt || new Date().toISOString())}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <Button
                    onClick={() => handleSync(repo.id)}
                    loading={isSyncing}
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 cursor-pointer bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>Sync AST</span>
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Repository Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Connect GitHub Repository</h3>
            <form onSubmit={handleAddRepository} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Repository Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI-CodeBase-Assistant"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  GitHub Repository URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://github.com/owner/repository"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={isAdding} className="bg-indigo-600 hover:bg-indigo-500 cursor-pointer">
                  Connect & Sync
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
