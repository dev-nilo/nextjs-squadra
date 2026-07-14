"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  logout as sessaoLogout,
  toSessaoAuth,
} from "@/lib/sessao";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.warn("[app] Supabase not configured - using local-only mode");
      setError("Supabase não está configurado");
      setLoading(false);
      return;
    }

    const auth = toSessaoAuth(createClient());

    const initAuth = async () => {
      try {
        const {
          data: { user: nextUser },
          error: userError,
        } = await auth.getUser();

        if (userError) {
          console.warn("[app] Auth warning:", userError.message);
        }

        setUser(nextUser || null);
      } catch (err) {
        console.error("[app] Session fetch error:", err);
        setError("Erro ao carregar sessão");
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    const auth = toSessaoAuth(createClient());
    const previousUserId = user?.id;
    const result = await sessaoLogout(auth);
    if (!result.ok) {
      console.error("[app] Logout error:", result.message);
      setError("Erro ao fazer logout");
      return;
    }
    setUser(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("squadra:logout", { detail: { userId: previousUserId } }),
      );
    }
  };

  return {
    user,
    loading,
    error,
    logout,
    isAuthenticated: !!user,
  };
}
