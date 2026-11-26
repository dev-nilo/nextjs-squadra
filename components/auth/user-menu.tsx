"use client"

import { useId, useState } from "react"
import { KeyRound, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { ChangePasswordModal } from "@/components/auth/change-password-modal"
import { useMenuFlutuante } from "@/components/ui/use-menu-flutuante"
import { applySessaoToast } from "@/lib/sessao"

export function UserMenu() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const menuId = useId()
  const { menuRef, botaoRef: triggerRef, onBeforeToggle } = useMenuFlutuante()
  const [passwordOpen, setPasswordOpen] = useState(false)

  if (!user) return null

  const handleLogout = async () => {
    const result = await logout()
    applySessaoToast(result, "login", toast)
    if (!result.ok) return
    // Server-rendered pages render again without the session: the sign-in screen.
    router.refresh()
  }

  // No email to take them from: a "?" rather than letters that mean nothing.
  const initials = user.email?.substring(0, 2).toUpperCase() || "?"

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={menuId}
        aria-label="Menu da conta"
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground transition-colors after:absolute after:-inset-1.5 after:content-[''] active:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {initials}
      </button>

      <div
        ref={menuRef}
        id={menuId}
        popover="auto"
        onBeforeToggle={onBeforeToggle}
        aria-label="Ações da conta"
        className="fixed m-0 min-w-[14rem] max-w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-divider bg-content1 p-1 text-foreground shadow-2xl"
      >
        <div className="flex flex-col gap-0.5 border-b border-divider px-3 py-3">
          <p className="text-xs text-default-500">Sua conta</p>
          <p className="max-w-[16rem] truncate text-sm font-semibold">{user.email}</p>
        </div>

        <button
          type="button"
          popoverTarget={menuId}
          popoverTargetAction="hide"
          onClick={() => setPasswordOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-default-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          <KeyRound className="h-4 w-4" />
          Alterar senha
        </button>

        <button
          type="button"
          popoverTarget={menuId}
          popoverTargetAction="hide"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>

      <ChangePasswordModal
        open={passwordOpen}
        email={user.email ?? ""}
        onOpenChange={setPasswordOpen}
      />
    </>
  )
}
