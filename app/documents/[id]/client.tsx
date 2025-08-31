"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDocumentsStore } from "@/store/documents";
import type { DocumentT } from "@/lib/schemas";
import Canvas from "@/components/flow/Canvas";

export default function EditorClient({ id }: { id: string }) {
  const { get, save } = useDocumentsStore();
  const [doc, setDoc] = useState<DocumentT | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const d = await get(id);
        if (!mounted) return;
        if (d) {
          setDoc(d);
        } else {
          setError("Document not found");
        }
      } catch (e) {
        if (mounted) setError((e as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [get, id]);

  // Debounced auto-save when doc changes and dirty flag set
  useEffect(() => {
    if (!doc || !dirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await save(doc);
      setDirty(false);
    }, 500);
  }, [doc, dirty, save]);

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="text-sm text-gray-500">Loading…</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <div className="text-sm text-red-600">{error}</div>
        <div className="mt-4">
          <Link href="/documents" className="underline underline-offset-4">
            Back to documents
          </Link>
        </div>
      </main>
    );
  }

  if (!doc) return null;

  return (
    <main className="min-h-screen p-0">
      <div className="border-b border-black/10 dark:border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/documents" className="text-sm underline underline-offset-4">
            ← Back
          </Link>
          <input
            value={doc.title}
            onChange={(e) => {
              setDoc({ ...doc, title: e.target.value });
              setDirty(true);
            }}
            className="text-lg font-medium bg-transparent outline-none rounded-md px-2 py-1 border border-transparent focus:border-black/10 dark:focus:border-white/10"
          />
          <div className="text-xs text-gray-500">{dirty ? "Saving…" : "Saved"}</div>
        </div>
        <div className="text-sm text-gray-500">Document ID: {doc.id}</div>
      </div>

      <div className="h-[calc(100vh-56px)] grid grid-cols-[240px_1fr]">
        <aside className="border-r border-black/10 dark:border-white/10 p-4">
          <div className="text-sm font-medium mb-2">Toolbar</div>
          <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
            <li>+ Text Node</li>
            <li>+ Image Node</li>
            <li>+ Combine Node</li>
            <li>+ Generate Node</li>
          </ul>
        </aside>
        <section className="relative">
          <div className="absolute inset-0">
            <div className="w-full h-full">
              {/* Empty canvas for now; data wiring comes later */}
              <Canvas />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
