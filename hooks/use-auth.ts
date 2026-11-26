"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { esquecerPaginas } from "@/lib/pwa/paginas";
import { isSupabaseConfigured, logout as sessaoLogout, toSessaoAuth, type SessaoResult } from "@/lib/sessao";

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
        setError("Não deu pra carregar a sessão.");
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

  /** Signs out and forgets the saved pages. The result says how it went, for the notice. */
  const logout = async (): Promise<SessaoResult> => {
    if (!isSupabaseConfigured()) {
      setUser(null);
      return { ok: true, code: "logged_out" };
    }
    const result = await sessaoLogout(toSessaoAuth(createClient()));
    if (!result.ok) {
      console.error("[app] Logout error:", result.message);
      return result;
    }
    // The pages saved for use with no signal are this person's: gone with the session.
    await esquecerPaginas();
    setUser(null);
    return result;
  };

  return {
    user,
    loading,
    error,
    logout,
    isAuthenticated: !!user,
  };
}
