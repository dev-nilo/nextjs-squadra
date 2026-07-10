"use client"

import { LogOut, User as UserIcon } from "lucide-react"
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  DropdownSection
} from "@nextui-org/react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

export function UserMenu() {
  const { user, logout } = useAuth()

  if (!user) return null

  const handleLogout = async () => {
    await logout()
    toast.success("Desconectado com sucesso!")
  }

  const initials = user.email?.substring(0, 2).toUpperCase() || "US"

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Avatar
          as="button"
          className="transition-transform"
          name={initials}
          size="sm"
          color="secondary"
        />
      </DropdownTrigger>
      <DropdownMenu aria-label="Ações da conta" variant="flat">
        <DropdownSection showDivider>
          <DropdownItem key="profile" className="h-14 gap-2" textValue="Sua conta" isReadOnly>
            <p className="font-semibold">Logado como</p>
            <p className="font-semibold truncate">{user.email}</p>
          </DropdownItem>
        </DropdownSection>
        
        <DropdownItem
          key="settings"
          startContent={<UserIcon className="w-4 h-4" />}
          textValue="Perfil"
          isDisabled
        >
          Perfil
        </DropdownItem>

        <DropdownItem
          key="logout"
          color="danger"
          startContent={<LogOut className="w-4 h-4" />}
          onPress={handleLogout}
          textValue="Desconectar"
        >
          Desconectar
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}
