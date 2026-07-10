import React from 'react';
import Link from 'next/link';
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Link as NextUILink } from "@nextui-org/react";

export default function Header() {
  return (
    <Navbar className="bg-content1/80 backdrop-blur-md border-b border-divider" maxWidth="xl">
      <NavbarBrand>
        <h1 className="text-2xl font-black tracking-tighter text-primary">Squadra</h1>
      </NavbarBrand>
      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        <NavbarItem>
          <NextUILink as={Link} color="foreground" href="/">
            Home
          </NextUILink>
        </NavbarItem>
        <NavbarItem>
          <NextUILink as={Link} color="foreground" href="/teams">
            Teams
          </NextUILink>
        </NavbarItem>
        <NavbarItem>
          <NextUILink as={Link} color="foreground" href="/schedule">
            Schedule
          </NextUILink>
        </NavbarItem>
        <NavbarItem>
          <NextUILink as={Link} color="foreground" href="/about">
            About
          </NextUILink>
        </NavbarItem>
        <NavbarItem>
          <NextUILink as={Link} color="foreground" href="/settings">
            Settings
          </NextUILink>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}
