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
  deleteConversation: (conversationId: string) => Promise<void>;
  theme: "dark" | "light";
  toggleTheme: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const deleteConversation = async (conversationId: string) => {
    // 1. Optimistically update local conversation state
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== conversationId);
      return filtered;
    });

    // 2. If the active conversation was deleted, switch to next available or null
    setActiveConversationId((prevActive) => {
      if (prevActive === conversationId) {
        const remaining = conversations.filter((c) => c.id !== conversationId);
        return remaining.length > 0 ? remaining[0].id : null;
      }
      return prevActive;
    });

    try {
      // 3. Delete from backend database
      await api.deleteConversation(conversationId);
    } catch (err: any) {
      console.error("[Workspace] Error deleting conversation:", err);
      // Re-sync to restore server truth on failure
      await refreshWorkspace();
      throw err;
    }
  };

  const refreshWorkspace = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Organizations
      let orgs: Organization[] = [];
      try {
        orgs = await api.listOrganizations();
        if (!orgs || orgs.length === 0) {
          // Auto-provision personal workspace organization
          const orgName = `${user.name || user.email.split("@")[0]}'s Workspace`;
          const orgSlug = `ws-${Date.now().toString(36)}`;
          const createdOrg = await api.createOrganization(orgName, orgSlug);
          if (createdOrg) {
            orgs = [createdOrg];
          }
        }
      } catch (e) {
        console.warn("[Workspace] Organization sync warning:", e);
      }
      setOrganizations(orgs);
      const currentOrg = (activeOrg && orgs.find((o) => o.id === activeOrg.id)) || orgs[0] || null;
      setActiveOrg(currentOrg);

      // 2. Fetch Projects
      let projs: Project[] = [];
      if (currentOrg) {
        try {
          projs = await api.listProjects(currentOrg.id);
          if (!projs || projs.length === 0) {
            // Auto-provision primary project
            const createdProj = await api.createProject(
              currentOrg.id,
              "Main Codebase",
              "Primary codebase repository and AI chat workspace"
            );
            if (createdProj) {
              projs = [createdProj];
            }
          }
        } catch (e) {
          console.warn("[Workspace] Project sync warning:", e);
        }
      }
      setProjects(projs);
      const currentProj = (activeProject && projs.find((p) => p.id === activeProject.id)) || projs[0] || null;
      setActiveProject(currentProj);

      // 3. Fetch Repositories
      let repos: Repository[] = [];
      if (currentProj) {
        try {
          repos = await api.listRepositories(currentProj.id);
        } catch (e) {
          console.warn("[Workspace] Repositories fetch warning:", e);
        }
      }
      setRepositories(repos);
      setActiveRepo((prevRepo) => {
        if (prevRepo && repos.some((r) => r.id === prevRepo.id)) return prevRepo;
        return repos[0] || null;
      });

      // 4. Fetch Conversations
      let convs: Conversation[] = [];
      if (currentProj) {
        try {
          convs = await api.listConversations(currentProj.id);
        } catch (e) {
          console.warn("[Workspace] Conversations fetch warning:", e);
        }
      }
      setConversations(convs);
      setActiveConversationId((prevActive) => {
        if (!prevActive && convs.length > 0) return convs[0].id;
        if (prevActive && !convs.some((c) => c.id === prevActive)) {
          return convs.length > 0 ? convs[0].id : null;
        }
        return prevActive;
      });
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
        deleteConversation,
        theme,
        toggleTheme,
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
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
