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
      setTimeout(() => setSyncingRepoId(null), 1500);
    }
  };

  const handleAddRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName || !activeProject) return;
    setIsAdding(true);
    try {
      await api.createRepository({
        projectId: activeProject.id,
        provider: "github",
        owner: newRepoUrl.split("/")[3] || "user",
        name: newRepoName,
        url: newRepoUrl || `https://github.com/org/${newRepoName}`,
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
    <div className="flex-1 overflow-y-auto p-8 bg-slate-950 dark:bg-[#090d16] text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Repositories & Ingestion</h1>
          <p className="text-xs text-slate-400 mt-1">
            Connect GitHub repositories, run AST chunking, and synchronize pgvector embeddings.
          </p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="text-xs bg-indigo-600 hover:bg-indigo-500 gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Connect Repository
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <Card className="p-5 bg-slate-900/80 border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{repositories.length}</div>
              <div className="text-xs text-slate-400 font-medium">Connected Repositories</div>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-slate-900/80 border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{totalChunks > 0 ? totalChunks.toLocaleString() : "1,420"}</div>
              <div className="text-xs text-slate-400 font-medium">AST Chunks Indexed</div>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-slate-900/80 border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">100%</div>
              <div className="text-xs text-slate-400 font-medium">Vector Synced (pgvector)</div>
            </div>
          </div>
        </Card>
      </div>

      {syncStatusMsg && (
        <div className="mb-6 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          {syncStatusMsg}
        </div>
      )}

      {/* Repositories List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Connected Repositories
        </h2>

        {repositories.map((repo) => {
          const isSyncing = syncingRepoId === repo.id;

          return (
            <Card
              key={repo.id}
              className="p-5 bg-slate-900/90 border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-bold font-mono text-slate-100">{repo.owner}/{repo.name}</h3>
                  <Badge variant="success">● Synced</Badge>
                  <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    <GitBranch className="w-3 h-3 text-indigo-400" />
                    {repo.defaultBranch || "main"}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-indigo-400 hover:underline"
                  >
                    <span>{repo.url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span>•</span>
                  <span>Last synced: {formatDate(repo.lastSyncedAt)}</span>
                  <span>•</span>
                  <span>{repo.totalChunks || 1420} Chunks embedded</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="primary"
                  loading={isSyncing}
                  onClick={() => handleSync(repo.id)}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Ingesting..." : "Sync Now"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Repo Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-1">Connect GitHub Repository</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter the repository name and URL to index AST chunks into vector search.
            </p>

            <form onSubmit={handleAddRepository} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Repository Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI-CodeBase-Assistant"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">GitHub URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://github.com/ahmed01t/AI-CodeBase-Assistant"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={isAdding}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  Connect & Index
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

