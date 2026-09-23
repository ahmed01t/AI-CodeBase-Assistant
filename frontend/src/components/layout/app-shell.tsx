"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { Bot, Loader2 } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!loading) {
      if (!user && !isLoginPage) {
        router.replace("/login");
      } else if (user && isLoginPage) {
        router.replace("/");
      }
    }
  }, [user, loading, isLoginPage, router]);

  // If on login page, render full screen without sidebar/topbar
  if (isLoginPage) {
    return <div className="min-h-screen w-full bg-slate-950 dark:bg-[#07090e]">{children}</div>;
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 animate-pulse">
          <Bot className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Authenticating CodePilot AI...</span>
        </div>
      </div>
    );
  }

  // If not authenticated and not yet redirected
  if (!user) {
    return null;
  }

  // Authenticated dashboard layout
  return (
    <div className="h-full flex w-full overflow-hidden bg-slate-950 dark:bg-[#090d16] text-slate-900 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 flex overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

