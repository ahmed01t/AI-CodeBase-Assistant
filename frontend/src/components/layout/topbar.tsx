"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon, RefreshCw, Menu } from "lucide-react";
import { useWorkspace } from "../../context/workspace-context";
import { api } from "../../lib/api-client";
import { Badge } from "../ui/badge";

export function Topbar() {
  const {
    activeProject,
    activeRepo,
    theme,
    toggleTheme,
    toggleSidebar,
    refreshWorkspace,
    loading,
  } = useWorkspace();
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkHealth() {
      try {
        await api.health();
        setApiHealthy(true);
      } catch {
        setApiHealthy(false);
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#090d16] px-4 sm:px-6 flex items-center justify-between shrink-0 select-none backdrop-blur-md transition-colors">
      {/* 1. Mobile Menu Button & Project/Repo Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
          className="md:hidden p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px] sm:max-w-none">
          <span className="text-slate-400 font-normal hidden sm:inline">Project:</span>
          <span className="text-indigo-600 dark:text-indigo-400 truncate max-w-[100px] sm:max-w-none">
            {activeProject?.name || "AI-CodeBase"}
          </span>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-slate-400 font-normal hidden sm:inline">Repo:</span>
          <span className="text-slate-800 dark:text-slate-200 truncate max-w-[90px] sm:max-w-none">
            {activeRepo?.name || "main"}
          </span>
        </div>

        {activeRepo?.status === "synced" && (
          <Badge variant="success" className="text-[10px] py-0 h-4 hidden sm:inline-flex">
            ● Synced
          </Badge>
        )}
      </div>

      {/* 2. Right Actions: Health Status, Theme Toggle, Refresh */}
      <div className="flex items-center gap-3">
        {/* API Backend Health Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
          <div
            className={`w-2 h-2 rounded-full ${
              apiHealthy === true
                ? "bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse"
                : apiHealthy === false
                ? "bg-amber-500"
                : "bg-slate-400"
            }`}
          />
          <span>{apiHealthy === true ? "API Online" : apiHealthy === false ? "DB Paused/Offline" : "Checking..."}</span>
        </div>

        {/* Refresh button */}
        <button
          onClick={refreshWorkspace}
          title="Refresh Workspace"
          className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-500" : ""}`} />
        </button>

        {/* Theme Toggle (Dark / Light Mode) */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="p-1.5 text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>
      </div>
    </header>
  );
}
