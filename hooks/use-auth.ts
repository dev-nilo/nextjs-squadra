"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { esquecerPaginas } from "@/lib/pwa/paginas";
import { isSupabaseConfigured, logout as sessaoLogout, toSessaoAuth } from "@/lib/sessao";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => isSupabaseConfigured());
  const [error, setError] = useState<string | null>(() =>
    isSupabaseConfigured() ? null : "Supabase não está configurado",
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const auth = toSessaoAuth(createClient());

    const initAuth = async () => {
      try {
        const { data, error: userError } = await auth.getUser();
        if (userError) {
          console.warn("[app] Auth warning:", userError.message);
        }
        setUser(data.user ?? null);
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
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    if (!isSupabaseConfigured()) {
      setUser(null);
      return;
    }
    const result = await sessaoLogout(toSessaoAuth(createClient()));
    if (!result.ok) {
      console.error("[app] Logout error:", result.message);
      setError("Erro ao fazer logout");
      return;
    }
    // The pages saved for use with no signal are this person's: gone with the session.
    await esquecerPaginas();
    setUser(null);
  };

  return {
    user,
    loading,
    error,
    logout,
    isAuthenticated: !!user,
  };
}
