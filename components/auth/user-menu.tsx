"use client"

import { useId, useRef } from "react"
import { LogOut, User as UserIcon } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

export function UserMenu() {
  const { user, logout } = useAuth()
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  if (!user) return null

  const handleLogout = async () => {
    await logout()
    toast.success("Desconectado com sucesso!")
  }

  const initials = user.email?.substring(0, 2).toUpperCase() || "US"

  const positionMenu = () => {
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return
    const rect = trigger.getBoundingClientRect()
    menu.style.top = `${rect.bottom + 8}px`
    menu.style.right = `${window.innerWidth - rect.right}px`
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={menuId}
        aria-label="Menu da conta"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground transition-transform active:scale-95"
      >
        {initials}
      </button>

      <div
        ref={menuRef}
        id={menuId}
        popover="auto"
        onBeforeToggle={positionMenu}
        aria-label="Ações da conta"
        className="fixed m-0 min-w-[14rem] max-w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-divider bg-content1 p-1 text-foreground shadow-2xl"
      >
        <div className="flex flex-col gap-0.5 border-b border-divider px-3 py-3">
          <p className="font-semibold">Logado como</p>
          <p className="max-w-[16rem] truncate font-semibold">{user.email}</p>
        </div>

        <div
          className="flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-sm text-default-400"
          aria-disabled="true"
        >
          <UserIcon className="h-4 w-4" />
          Perfil
        </div>

        <button
          type="button"
          popoverTarget={menuId}
          popoverTargetAction="hide"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
        >
          <LogOut className="h-4 w-4" />
          Desconectar
        </button>
      </div>
    </>
  )
}
