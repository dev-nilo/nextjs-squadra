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
      console.warn("[v0] Supabase not configured - using local-only mode")
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
          console.warn("[v0] Auth warning:", userError.message)
        }

        setUser(user || null)
      } catch (err) {
        console.error("[v0] Session fetch error:", err)
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
      console.log("[v0] Auth state changed:", event)
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
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
    } catch (err) {
      console.error("[v0] Logout error:", err)
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
