import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Art Nodes",
};

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/documents" className="font-semibold tracking-tight">
            Art Nodes
          </Link>
          <NavBar />
        </div>
      </header>
      <div className="max-w-6xl mx-auto w-full px-6 py-6">{children}</div>
    </div>
  );
}

