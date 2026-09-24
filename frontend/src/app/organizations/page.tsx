"use client";

import React, { useState } from "react";
import { Building2, Plus, FolderKanban, ShieldCheck } from "lucide-react";
import { useWorkspace } from "../../context/workspace-context";
import { api } from "../../lib/api-client";
import { Button } from "../../components/ui/button";
import { Card, Badge } from "../../components/ui/badge";

export default function OrganizationsPage() {
  const {
    organizations,
    activeOrg,
    setActiveOrg,
    projects,
    setActiveProject,
    refreshWorkspace,
  } = useWorkspace();

  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showProjModal, setShowProjModal] = useState(false);

  // Form states
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [projName, setProjName] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !orgSlug) return;
    setSubmitting(true);
    try {
      await api.createOrganization(orgName.trim(), orgSlug.trim().toLowerCase());
      setShowOrgModal(false);
      setOrgName("");
      setOrgSlug("");
      await refreshWorkspace();
    } catch (err: any) {
      alert(`Failed to create organization: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName || !activeOrg) return;
    setSubmitting(true);
    try {
      await api.createProject(activeOrg.id, projName.trim(), projDesc.trim());
      setShowProjModal(false);
      setProjName("");
      setProjDesc("");
      await refreshWorkspace();
    } catch (err: any) {
      alert(`Failed to create project: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Organizations & Projects
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Manage multi-tenant organizations and projects. All repositories and conversations are isolated by project.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowOrgModal(true)}
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Organization</span>
          </Button>
          <Button
            onClick={() => setShowProjModal(true)}
            size="sm"
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </Button>
        </div>
      </div>

      {/* Organizations Section */}
      <div className="mb-8 sm:mb-10 space-y-4">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Organizations ({organizations.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {organizations.map((org) => (
            <Card
              key={org.id}
              className={`p-4 sm:p-5 cursor-pointer transition-all ${
                activeOrg?.id === org.id
                  ? "bg-white dark:bg-slate-900 border-indigo-500/70 shadow-sm shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                  : "bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
              onClick={() => setActiveOrg(org)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {org.name}
                    </h3>
                    <div className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                      slug: {org.slug}
                    </div>
                  </div>
                </div>
                {activeOrg?.id === org.id && <Badge variant="indigo">Active Org</Badge>}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Projects Section */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Projects under {activeOrg?.name || "Active Organization"} ({projects.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => (
            <Card
              key={proj.id}
              className="p-4 sm:p-5 bg-white/70 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderKanban className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {proj.name}
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  UUID Ready
                </Badge>
              </div>

              {proj.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {proj.description}
                </p>
              )}

              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80">
                <span className="font-mono truncate max-w-[180px] sm:max-w-none">id: {proj.id}</span>
                <button
                  onClick={() => setActiveProject(proj)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                >
                  Select Active
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* New Organization Modal */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Create New Organization</h3>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Slug (lowercase letters, numbers, hyphens)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. acme-corp"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOrgModal(false)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={submitting} className="bg-indigo-600 hover:bg-indigo-500 cursor-pointer">
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showProjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Create Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Backend Microservice"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main API service"
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProjModal(false)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={submitting} className="bg-indigo-600 hover:bg-indigo-500 cursor-pointer">
                  Create Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

