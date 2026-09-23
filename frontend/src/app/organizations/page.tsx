"use client";

import React, { useState } from "react";
import { Building2, FolderKanban, Plus, GitBranch } from "lucide-react";
import { useWorkspace } from "../../context/workspace-context";
import { api } from "../../lib/api-client";
import { Button } from "../../components/ui/button";
import { Card, Badge } from "../../components/ui/badge";
import { formatDate } from "../../lib/utils";

export default function OrganizationsPage() {
  const { organizations, activeOrg, setActiveOrg, projects, refreshWorkspace } =
    useWorkspace();
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showProjModal, setShowProjModal] = useState(false);
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
      await api.createOrganization(orgName, orgSlug);
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
      await api.createProject(activeOrg.id, projName, projDesc);
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
    <div className="flex-1 overflow-y-auto p-8 bg-slate-950 dark:bg-[#090d16] text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Organizations & Projects</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage multi-tenant organizations and projects. All repositories and conversations are isolated by project.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowOrgModal(true)}
            variant="outline"
            className="text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Organization
          </Button>
          <Button
            onClick={() => setShowProjModal(true)}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </Button>
        </div>
      </div>

      {/* Organizations Section */}
      <div className="mb-10 space-y-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Organizations ({organizations.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {organizations.map((org) => (
            <Card
              key={org.id}
              className={`p-5 cursor-pointer transition-all ${
                activeOrg?.id === org.id
                  ? "bg-slate-900 border-indigo-500/50 shadow-md shadow-indigo-500/10"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}
              onClick={() => setActiveOrg(org)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{org.name}</h3>
                    <div className="text-xs font-mono text-slate-500">slug: {org.slug}</div>
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
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Projects under {activeOrg?.name || "Active Organization"} ({projects.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => (
            <Card key={proj.id} className="p-5 bg-slate-900/80 border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-200">{proj.name}</h3>
              </div>
              <p className="text-xs text-slate-400">{proj.description || "No description provided."}</p>
              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                Created: {formatDate(proj.createdAt)}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* New Org Modal */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4">Create Organization</h3>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Slug</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. acme-corp"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowOrgModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={submitting} className="bg-indigo-600">
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showProjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4">Create Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Backend Microservice"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Main API service"
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowProjModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={submitting} className="bg-indigo-600">
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

