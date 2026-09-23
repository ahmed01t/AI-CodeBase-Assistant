"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { setAuthToken } from "../lib/api-client";
import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ user: any; session: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check existing Supabase session
    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          const u: User = {
            id: session.user.id,
            email: session.user.email || "",
            name:
              session.user.user_metadata?.full_name ||
              session.user.email?.split("@")[0] ||
              "Developer",
          };
          setUser(u);
          setToken(session.access_token);
          setAuthToken(session.access_token);
        } else {
          setUser(null);
          setToken(null);
          setAuthToken(null);
        }
      } catch (err) {
        console.warn("[Auth] Session check failed:", err);
        setUser(null);
        setToken(null);
        setAuthToken(null);
      } finally {
        setLoading(false);
      }
    }

    checkSession();

    // Listen to Supabase auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const u: User = {
          id: session.user.id,
          email: session.user.email || "",
          name:
            session.user.user_metadata?.full_name ||
            session.user.email?.split("@")[0] ||
            "Developer",
        };
        setUser(u);
        setToken(session.access_token);
        setAuthToken(session.access_token);
      } else {
        setUser(null);
        setToken(null);
        setAuthToken(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data.session) {
      setUser({
        id: data.user.id,
        email: data.user.email || "",
        name:
          data.user.user_metadata?.full_name ||
          data.user.email?.split("@")[0] ||
          "Developer",
      });
      setToken(data.session.access_token);
      setAuthToken(data.session.access_token);
    }
  };

  const signUpWithPassword = async (
    email: string,
    password: string,
    fullName?: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName?.trim() || email.split("@")[0],
        },
      },
    });
    if (error) throw error;
    if (data.session) {
      setUser({
        id: data.user?.id || "u-new",
        email: data.user?.email || email,
        name:
          data.user?.user_metadata?.full_name ||
          fullName ||
          email.split("@")[0],
      });
      setToken(data.session.access_token);
      setAuthToken(data.session.access_token);
    }
    return data;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setToken(null);
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signInWithPassword,
        signUpWithPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
