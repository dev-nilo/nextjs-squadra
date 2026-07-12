"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
  Link as NextUILink,
} from "@nextui-org/react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/teams", label: "Teams" },
  { href: "/schedule", label: "Schedule" },
  { href: "/about", label: "About" },
  { href: "/settings", label: "Settings" },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <Navbar
      className="bg-content1/80 backdrop-blur-md border-b border-divider"
      maxWidth="xl"
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
    >
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          className="sm:hidden"
        />
        <NavbarBrand>
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-primary">
            Squadra
          </h1>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        {NAV_LINKS.map((link) => (
          <NavbarItem key={link.href}>
            <NextUILink as={Link} color="foreground" href={link.href}>
              {link.label}
            </NextUILink>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarMenu className="bg-content1/95 pt-4">
        {NAV_LINKS.map((link) => (
          <NavbarMenuItem key={link.href}>
            <NextUILink
              as={Link}
              color="foreground"
              href={link.href}
              className="w-full text-lg font-semibold py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </NextUILink>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </Navbar>
  );
}
