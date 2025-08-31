export default function DocumentsPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold">Documents</h1>
      <p className="text-sm text-gray-500 mt-2">List of documents will appear here.</p>
    </main>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDocumentsStore } from "@/store/documents";

export default function DocumentsPage() {
  const router = useRouter();
  const { docs, loading, error, refresh, create, remove } = useDocumentsStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createNew = async () => {
    const doc = await create();
    router.push(`/documents/${doc.id}`);
  };

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <button
          onClick={createNew}
          className="rounded-md border border-black/10 dark:border-white/10 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
        >
          Create New
        </button>
      </div>

      {loading && <p className="mt-6 text-sm text-gray-500">Loading…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && docs.length === 0 && (
        <div className="mt-10 text-sm text-gray-500">No documents yet. Create one to get started.</div>
      )}

      <ul className="mt-6 divide-y divide-black/10 dark:divide-white/10">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center justify-between py-3">
            <div>
              <div className="font-medium">{d.title}</div>
              <div className="text-xs text-gray-500">Updated {new Date(d.updatedAt).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/documents/${d.id}`}
                className="text-sm underline underline-offset-4 hover:opacity-80"
              >
                Open
              </Link>
              <button
                onClick={() => remove(d.id)}
                className="text-sm text-red-600 hover:underline underline-offset-4"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

