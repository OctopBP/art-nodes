"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isDocuments = href === "/documents";
  const active = isDocuments
    ? pathname === "/documents" || pathname.startsWith("/documents/")
    : pathname === href;

  const base = "text-sm transition-colors underline-offset-4";
  const inactive = "text-foreground/70 hover:text-foreground hover:underline";
  const activeCls = "text-foreground font-medium underline";

  return (
    <Link href={href} className={[base, active ? activeCls : inactive].join(" ")}> 
      {children}
    </Link>
  );
}

export default function NavBar() {
  return (
    <nav className="flex items-center gap-4">
      <NavLink href="/documents">Documents</NavLink>
      <NavLink href="/settings">Settings</NavLink>
    </nav>
  );
}

