import React from 'react';
import Link from 'next/link';
import { Link as NextUILink } from "@nextui-org/react";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-content1/80 text-foreground p-4 shadow-md backdrop-blur-md border-r border-divider hidden md:block">
      <nav className="space-y-4 flex flex-col">
        <NextUILink as={Link} color="foreground" href="/" className="font-semibold text-lg hover:text-primary transition-colors">
          Home
        </NextUILink>
        <NextUILink as={Link} color="foreground" href="/teams" className="font-semibold text-lg hover:text-primary transition-colors">
          Teams
        </NextUILink>
        <NextUILink as={Link} color="foreground" href="/schedule" className="font-semibold text-lg hover:text-primary transition-colors">
          Schedule
        </NextUILink>
        <NextUILink as={Link} color="foreground" href="/about" className="font-semibold text-lg hover:text-primary transition-colors">
          About
        </NextUILink>
        <NextUILink as={Link} color="foreground" href="/settings" className="font-semibold text-lg hover:text-primary transition-colors">
          Settings
        </NextUILink>
      </nav>
    </aside>
  );
}
