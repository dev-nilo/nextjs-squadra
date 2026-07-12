"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Link as NextUILink, Button } from "@nextui-org/react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/teams", label: "Teams" },
  { href: "/schedule", label: "Schedule" },
  { href: "/about", label: "About" },
  { href: "/settings", label: "Settings" },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        isIconOnly
        variant="flat"
        className="fixed bottom-4 right-4 z-50 md:hidden shadow-lg"
        onPress={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? "Fechar navegação" : "Abrir navegação"}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 max-w-[85vw] bg-content1/95 md:bg-content1/80 text-foreground
          p-4 shadow-md backdrop-blur-md border-r border-divider
          transition-transform duration-200 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          md:block
        `}
      >
        <nav className="space-y-3 flex flex-col">
          {NAV_LINKS.map((link) => (
            <NextUILink
              key={link.href}
              as={Link}
              color="foreground"
              href={link.href}
              className="font-semibold text-base sm:text-lg hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </NextUILink>
          ))}
        </nav>
      </aside>
    </>
  );
}
