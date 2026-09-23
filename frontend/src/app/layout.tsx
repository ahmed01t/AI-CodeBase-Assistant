import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/auth-context";
import { WorkspaceProvider } from "../context/workspace-context";
import { AppShell } from "../components/layout/app-shell";

export const metadata: Metadata = {
  title: "CodePilot AI - AI Codebase Assistant",
  description: "Senior AI Codebase Assistant with AST code chunking, pgvector search, and real-time streaming",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body
        className="h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex overflow-hidden font-sans"
        suppressHydrationWarning
      >
        <AuthProvider>
          <WorkspaceProvider>
            <AppShell>{children}</AppShell>
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
