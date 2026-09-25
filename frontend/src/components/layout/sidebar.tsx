"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  FolderGit2,
  Search,
  GitPullRequestArrow,
  Building2,
  Webhook,
  Plus,
  ChevronDown,
  GitBranch,
  Bot,
  LogOut,
  X,
  Trash2,
} from "lucide-react";
import { useWorkspace } from "../../context/workspace-context";
import { useAuth } from "../../context/auth-context";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { api } from "../../lib/api-client";

export function Sidebar() {
  const pathname = usePathname();
  const {
    organizations,
    activeOrg,
    setActiveOrg,
    projects,
    activeProject,
    setActiveProject,
    conversations,
    activeConversationId,
    setActiveConversationId,
    deleteConversation,
    sidebarOpen,
    setSidebarOpen,
    refreshWorkspace,
  } = useWorkspace();
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  const handleDeleteConversation = async (
    e: React.MouseEvent,
    conversationId: string,
    title?: string | null
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      `Are you sure you want to delete the thread "${title || "Untitled"}"?`
    );
    if (!confirmed) return;

    try {
      setDeletingChatId(conversationId);
      await deleteConversation(conversationId);
    } catch (err: any) {
      alert(`Failed to delete conversation: ${err.message || "Unknown error"}`);
    } finally {
      setDeletingChatId(null);
    }
  };

  const navItems = [
    { label: "AI Code Assistant", href: "/", icon: MessageSquare },
    { label: "Repositories & Sync", href: "/repositories", icon: FolderGit2 },
    { label: "Semantic Search", href: "/search", icon: Search },
    { label: "Change Impact", href: "/impact-analysis", icon: GitPullRequestArrow },
    { label: "Organizations & Projects", href: "/organizations", icon: Building2 },
    { label: "GitHub Webhooks", href: "/webhooks", icon: Webhook },
  ];

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={cn(
          "w-64 h-screen bg-slate-50 dark:bg-[#07090e] border-r border-slate-200 dark:border-slate-800/80 flex flex-col shrink-0 select-none transition-transform duration-200 ease-in-out z-50",
          "fixed inset-y-0 left-0 md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* 1. Header: Logo & Org Switcher */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 font-bold text-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
                  NexusCode AI
                </div>
                <button
                  onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <span className="truncate max-w-[120px]">
                    {activeOrg?.name || "Workspace"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Mobile close drawer button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Org Dropdown */}
          {showOrgDropdown && (
            <div className="mt-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg shadow-xl text-xs space-y-1">
              <div className="px-2 py-1 text-slate-500 dark:text-slate-400 font-medium">
                Switch Organization
              </div>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setActiveOrg(org);
                    setShowOrgDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between cursor-pointer",
                    activeOrg?.id === org.id
                      ? "text-indigo-600 dark:text-indigo-400 font-medium bg-slate-100 dark:bg-slate-800/60"
                      : "text-slate-700 dark:text-slate-300"
                  )}
                >
                  {org.name}
                </button>
              ))}
            </div>
          )}

          {/* 2. Project Selector */}
          <div className="mt-3">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Active Project
            </label>
            <div className="relative">
              <button
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
              >
                <span className="truncate max-w-[170px] font-medium">
                  {activeProject?.name || "Select Project"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showProjectDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg shadow-xl z-20 space-y-0.5">
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      onClick={() => {
                        setActiveProject(proj);
                        setShowProjectDropdown(false);
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors truncate cursor-pointer",
                        activeProject?.id === proj.id
                          ? "text-indigo-600 dark:text-indigo-400 font-medium bg-slate-100 dark:bg-slate-800/60"
                          : "text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {proj.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150",
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 4. Conversations List (Chat History) */}
        <div className="flex-1 flex flex-col min-h-0 border-t border-slate-200 dark:border-slate-800/80 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Recent Threads
            </span>
            <button
              onClick={() => {
                setActiveConversationId(null);
                handleNavClick();
              }}
              title="New Chat Thread"
              className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {conversations.length === 0 ? (
              <div className="text-center py-6 px-2">
                <MessageSquare className="w-6 h-6 text-slate-300 dark:text-slate-700 mx-auto mb-1.5" />
                <p className="text-[11px] text-slate-400 dark:text-slate-500">No conversations yet</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-600">Start asking about your codebase</p>
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveConversationId(c.id);
                    handleNavClick();
                  }}
                  className={cn(
                    "group w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer",
                    activeConversationId === c.id
                      ? "bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 font-medium"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{c.title || "Untitled Conversation"}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, c.id, c.title)}
                    disabled={deletingChatId === c.id}
                    title="Delete Chat Thread"
                    className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-opacity rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 5. User Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-100/60 dark:bg-slate-950/60">
          {user && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 flex items-center justify-center text-indigo-700 dark:text-slate-300 text-xs font-semibold">
                  {user.email[0]?.toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {user.name || "Developer"}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                onClick={signOut}
                title="Sign Out"
                className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors rounded-md cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}