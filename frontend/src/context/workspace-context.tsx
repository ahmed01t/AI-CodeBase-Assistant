"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api-client";
import { useAuth } from "./auth-context";
import type { Organization, Project, Repository, Conversation } from "../types";

interface WorkspaceContextType {
  organizations: Organization[];
  activeOrg: Organization | null;
  setActiveOrg: (org: Organization | null) => void;
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  repositories: Repository[];
  activeRepo: Repository | null;
  setActiveRepo: (repo: Repository | null) => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  refreshWorkspace: () => Promise<void>;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [activeRepo, setActiveRepo] = useState<Repository | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [loading, setLoading] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("codebase_theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", prefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("codebase_theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const refreshWorkspace = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Organizations
      let orgs: Organization[] = [];
      try {
        orgs = await api.listOrganizations();
      } catch {
        // Fallback default org for demo
        orgs = [{ id: "org-1", name: "Acme Corp", slug: "acme-corp", createdAt: new Date().toISOString() }];
      }
      setOrganizations(orgs);
      const currentOrg = orgs[0] || null;
      setActiveOrg(currentOrg);

      // 2. Fetch Projects
      let projs: Project[] = [];
      try {
        projs = await api.listProjects(currentOrg?.id);
      } catch {
        projs = [
          {
            id: "proj-1",
            organizationId: currentOrg?.id || "org-1",
            name: "Core Backend API",
            description: "Express + TypeScript codebase assistant",
            createdAt: new Date().toISOString(),
          },
        ];
      }
      setProjects(projs);
      const currentProj = projs[0] || null;
      setActiveProject(currentProj);

      // 3. Fetch Repositories
      let repos: Repository[] = [];
      try {
        repos = await api.listRepositories(currentProj?.id);
      } catch {
        repos = [
          {
            id: "repo-1",
            projectId: currentProj?.id || "proj-1",
            provider: "github",
            owner: "ahmed01t",
            name: "AI-CodeBase-Assistant",
            url: "https://github.com/ahmed01t/AI-CodeBase-Assistant",
            defaultBranch: "main",
            status: "synced",
            totalChunks: 1420,
            lastSyncedAt: new Date().toISOString(),
          },
        ];
      }
      setRepositories(repos);
      setActiveRepo(repos[0] || null);

      // 4. Fetch Conversations
      let convs: Conversation[] = [];
      try {
        convs = await api.listConversations(currentProj?.id);
      } catch {
        convs = [
          {
            id: "conv-1",
            projectId: currentProj?.id || "proj-1",
            userId: user.id,
            title: "Auth Middleware Explanation",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "conv-2",
            projectId: currentProj?.id || "proj-1",
            userId: user.id,
            title: "Tree-sitter WASM Setup",
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      }
      setConversations(convs);
      if (convs.length > 0 && !activeConversationId) {
        setActiveConversationId(convs[0].id);
      }
    } catch (err) {
      console.error("[Workspace] Failed to refresh workspace:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshWorkspace();
    }
  }, [user]);

  return (
    <WorkspaceContext.Provider
      value={{
        organizations,
        activeOrg,
        setActiveOrg,
        projects,
        activeProject,
        setActiveProject,
        repositories,
        activeRepo,
        setActiveRepo,
        conversations,
        activeConversationId,
        setActiveConversationId,
        theme,
        toggleTheme,
        refreshWorkspace,
        loading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}

