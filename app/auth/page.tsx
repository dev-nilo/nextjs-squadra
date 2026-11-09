"use client"

import { useRouter } from "next/navigation"
import { AuthPanel } from "@/components/auth/auth-panel"

export default function AuthPage() {
  const router = useRouter()
  return <AuthPanel onSuccess={() => router.push("/")} />
}
