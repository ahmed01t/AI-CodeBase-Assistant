"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Lock,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/auth-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithPassword, signUpWithPassword } = useAuth();

  // Mode: "signin" | "register"
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState<string | null>(null);

  const handleModeChange = (mode: "signin" | "register") => {
    setAuthMode(mode);
    setErrorMsg(null);
    setRegisteredSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setRegisteredSuccess(null);

    if (!email || !password) {
      setErrorMsg("Please provide both email and password.");
      return;
    }

    if (authMode === "register") {
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match. Please re-enter.");
        return;
      }
    }

    setLoading(true);
    try {
      if (authMode === "register") {
        const data = await signUpWithPassword(email, password, fullName);
        if (data?.session) {
          router.replace("/");
        } else {
          setRegisteredSuccess(
            `Account registered for ${email}! Please verify your email or sign in with your password.`
          );
          setAuthMode("signin");
          setPassword("");
          setConfirmPassword("");
        }
      } else {
        await signInWithPassword(email, password);
        router.replace("/");
      }
    } catch (err: any) {
      if (err.message?.includes("Failed to fetch") || err.name === "TypeError") {
        setErrorMsg(
          "Network Error: Unable to reach your Supabase database instance. Please verify that your Supabase project is active (not paused/deleted) and that NEXT_PUBLIC_SUPABASE_URL in frontend/.env.local is correct."
        );
      } else {
        setErrorMsg(
          err.message ||
            "Authentication failed. Please check your credentials and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 dark:bg-[#07090e] p-4 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-7 shadow-xl dark:shadow-2xl space-y-5">
        
        {/* Logo & Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 mx-auto">
            <Bot className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            CodePilot AI
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enterprise Autonomous AI Engineering & Codebase Intelligence
          </p>
        </div>

        {/* Tab Switching: Sign In vs Register */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-750">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => handleModeChange("signin")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              authMode === "signin"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => handleModeChange("register")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              authMode === "register"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Registration Success Notification */}
        {registeredSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Registration Successful!</span>
              <span>{registeredSuccess}</span>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-600 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name field (Register only) */}
          {authMode === "register" && (
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Full Name
              </label>
              <Input
                type="text"
                placeholder="e.g. Alex Rivera"
                icon={<UserIcon className="w-4 h-4 text-slate-400" />}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              required
              placeholder="developer@company.com"
              icon={<Mail className="w-4 h-4 text-slate-400" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Password <span className="text-rose-500">*</span>
              </label>
              {authMode === "register" && (
                <span className="text-[10px] text-slate-400">Min 6 characters</span>
              )}
            </div>
            <Input
              type="password"
              required
              placeholder={authMode === "register" ? "Create a secure password" : "••••••••"}
              icon={<Lock className="w-4 h-4 text-slate-400" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Confirm Password (Register only) */}
          {authMode === "register" && (
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <Input
                type="password"
                required
                placeholder="Re-enter your password"
                icon={<KeyRound className="w-4 h-4 text-slate-400" />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[11px] text-rose-500 mt-1">Passwords do not match.</p>
              )}
              {confirmPassword && password === confirmPassword && password.length >= 6 && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Passwords match
                </p>
              )}
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-medium py-2 rounded-xl text-xs transition-colors shadow-sm cursor-pointer mt-2"
          >
            {authMode === "register" ? "Register & Create Account" : "Sign In to Workspace"}
          </Button>
        </form>

        {/* Bottom Switcher */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          {authMode === "register" ? (
            <span>
              Already have an account?{" "}
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => handleModeChange("signin")}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
              >
                Sign In here
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{" "}
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => handleModeChange("register")}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
              >
                Create an account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
