"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  FolderGit2,
  Search,
  Building2,
  Webhook,
  Plus,
  ChevronDown,
  GitBranch,
  Bot,
  LogOut,
} from "lucide-react";
import { useWorkspace } from "../../context/workspace-context";
import { useAuth } from "../../context/auth-context";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

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
  } = useWorkspace();
  const { user, signOut } = useAuth();
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  const navItems = [
    { label: "AI Code Assistant", href: "/", icon: MessageSquare },
    { label: "Repositories & Sync", href: "/repositories", icon: FolderGit2 },
    { label: "Semantic Search", href: "/search", icon: Search },
    { label: "Organizations & Projects", href: "/organizations", icon: Building2 },
    { label: "GitHub Webhooks", href: "/webhooks", icon: Webhook },
  ];

  return (
    <aside className="w-64 h-screen bg-slate-50 dark:bg-[#07090e] border-r border-slate-200 dark:border-slate-800/80 flex flex-col shrink-0 select-none transition-colors">
      {/* 1. Header: Logo & Org Switcher */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 font-bold text-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">CodePilot AI</div>
              <button
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white transition-colors"
              >
                <span className="truncate max-w-[120px]">{activeOrg?.name || "Acme Corp"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Org Dropdown */}
        {showOrgDropdown && (
          <div className="mt-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg shadow-xl text-xs space-y-1">
            <div className="px-2 py-1 text-slate-500 dark:text-slate-400 font-medium">Switch Organization</div>
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  setActiveOrg(org);
                  setShowOrgDropdown(false);
                }}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between",
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
              className="w-full flex items-center justify-between px-3 py-1.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-1.5 truncate">
                <GitBranch className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                <span className="truncate">{activeProject?.name || "No Project"}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {showProjectDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 space-y-1">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveProject(p);
                      setShowProjectDropdown(false);
                    }}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5",
                      activeProject?.id === p.id
                        ? "text-indigo-600 dark:text-indigo-400 font-medium bg-slate-100 dark:bg-slate-800/60"
                        : "text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <GitBranch className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Navigation Links */}
      <div className="px-3 py-3 space-y-1 border-b border-slate-200 dark:border-slate-800/70">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150",
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400")} />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* 4. Chat History Threads */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Chat Threads
          </span>
          <Link href="/">
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
              <Plus className="w-3 h-3 mr-1" /> New
            </Button>
          </Link>
        </div>

        <div className="space-y-1">
          {conversations.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
              No previous threads. Start a new chat!
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveConversationId(c.id)}
                className={cn(
                  "w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors",
                  activeConversationId === c.id
                    ? "bg-indigo-50/80 dark:bg-slate-800/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-slate-700/80 font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span className="truncate">{c.title || "Untitled Conversation"}</span>
              </button>
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
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{user.name || "Developer"}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
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
  );
}
