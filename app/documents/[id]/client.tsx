"use client";

import Link from 'next/link'
import { useCallback } from 'react'
import Canvas from '@/components/flow/Canvas'
import { nodeTypes } from '@/components/flow/nodeRegistry'
import { AddNodeToolbar } from '@/components/flow/AddNodeToolbar'
import { isValidConnectionByHandles } from '@/lib/ports'
import { createsCycle } from '@/lib/graph'
import { useEditorDocument } from './useEditorDocument'

import type { Edge as RFEdge, Node as RFNode, Connection, ReactFlowProps, IsValidConnection } from "@xyflow/react";
import type { NodeData } from "@/lib/schemas";
type FlowEdge = RFEdge;

export default function EditorClient({ id }: { id: string }) {
  const { doc, loading, error, dirty, saving, setTitle, handleCanvasChange, addNode, saveNow } = useEditorDocument(id);

  // Keep hooks before any conditional returns
  const isValidConnection = useCallback<IsValidConnection>(
    (edgeOrConn) => {
      const conn = edgeOrConn as Connection;
      if (!isValidConnectionByHandles(conn)) return false;
      const edges = (doc?.edges || []) as unknown as FlowEdge[];
      return !createsCycle(conn, edges);
    },
    [doc?.edges]
  );

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

  // nodeTypes and addNode are imported/extracted

  return (
    <main className="min-h-screen p-0">
      <div className="border-b border-black/10 dark:border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/documents" className="text-sm underline underline-offset-4">
            ← Back
          </Link>
          <input
            value={doc.title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-medium bg-transparent outline-none rounded-md px-2 py-1 border border-transparent focus:border-black/10 dark:focus:border-white/10"
          />
          <div className="text-xs text-gray-500">
            {saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={saveNow}
            disabled={!dirty || saving}
            className="px-3 py-1 text-sm rounded-md border border-black/10 dark:border-white/10 disabled:opacity-50"
          >
            Save
          </button>
          <div className="text-sm text-gray-500">Document ID: {doc.id}</div>
        </div>
      </div>

      <div className="h-[calc(100vh-56px)] relative">
        <section className="relative w-full h-full">
          <AddNodeToolbar onAdd={addNode} />
          <div className="absolute inset-0">
            <div className="w-full h-full">
              <Canvas
                nodes={doc.nodes as unknown as RFNode<NodeData>[]}
                edges={doc.edges as unknown as FlowEdge[]}
                onChange={handleCanvasChange}
                nodeTypes={nodeTypes as ReactFlowProps['nodeTypes']}
                isValidConnection={isValidConnection}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
