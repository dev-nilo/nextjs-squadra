'use client';

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Check if Supabase is properly configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.warn("[app] Supabase not configured - using local-only mode")
      setError("Supabase não está configurado")
      setLoading(false)
      return
    }

    const supabase = createClient()

    const initAuth = async () => {
      try {
        // Get initial session
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          console.warn("[app] Auth warning:", userError.message)
        }

        setUser(user || null)
      } catch (err) {
        console.error("[app] Session fetch error:", err)
        setError("Erro ao carregar sessão")
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    setIsInitialized(true)

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const logout = async () => {
    const supabase = createClient()
    try {
      const previousUserId = user?.id
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      // Clear in-memory session; per-user localStorage keys remain isolated
      if (typeof window !== "undefined") {
        // Soft signal for the main app to reset — user.id change already clears state
        window.dispatchEvent(
          new CustomEvent("squadra:logout", { detail: { userId: previousUserId } }),
        )
      }
    } catch (err) {
      console.error("[app] Logout error:", err)
      setError("Erro ao fazer logout")
    }
  }

  return {
    user,
    loading,
    error,
    logout,
    isAuthenticated: !!user,
  }
}
