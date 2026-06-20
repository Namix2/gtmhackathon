"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/rss", label: "RSS" },
  { href: "/sources", label: "Sources" },
  { href: "/nets", label: "Nets" },
  { href: "/candidates", label: "Candidates" },
  { href: "/individuals", label: "Individuals" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div>
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Champion Discovery
          </Link>
          <p className="text-muted-foreground text-sm">
            Discovery & dedupe foundation
          </p>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
