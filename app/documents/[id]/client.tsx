"use client";

import { GitMerge, Image as ImageIcon, Type, Wand2 } from 'lucide-react'
import { nanoid } from 'nanoid'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import Canvas from '@/components/flow/Canvas'
import CombineNode from '@/components/nodes/CombineNode'
import GenerateNode from '@/components/nodes/GenerateNode'
import ImageNode from '@/components/nodes/ImageNode'
import TextNode from '@/components/nodes/TextNode'
import { isValidConnectionByHandles } from '@/lib/ports'
import { useDocumentsStore } from '@/store/documents'

import type { DocumentT } from "@/lib/schemas";
import type { Edge as RFEdge, Node as RFNode, Connection } from "@xyflow/react";
import type { NodeData } from "@/lib/schemas";
type FlowNode = RFNode<NodeData>;
type FlowEdge = RFEdge;

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

  // Stable handler for Canvas changes to keep Hooks order consistent
  const handleCanvasChange = useCallback((nodes: FlowNode[], edges: FlowEdge[]) => {
    setDoc((prev) => (prev ? { ...prev, nodes: nodes as any, edges: edges as any } : prev));
    setDirty(true);
  }, []);

  // Keep hooks before any conditional returns
  const isValidConnection = useCallback(
    (conn: Connection) => {
      // First, enforce port types
      if (!isValidConnectionByHandles(conn)) return false;
      // Then, prevent cycles: disallow if there is already a path from target -> source
      const source = conn.source;
      const target = conn.target;
      if (!source || !target) return true;

      // Build adjacency from current edges (use the latest doc state)
      const edges = (doc?.edges || []) as unknown as FlowEdge[];
      const adj = new Map<string, string[]>();
      for (const e of edges) {
        if (!adj.has(e.source)) adj.set(e.source, []);
        adj.get(e.source)!.push(e.target);
      }
      // Include the proposed edge
      if (!adj.has(source)) adj.set(source, []);
      adj.get(source)!.push(target);

      // DFS from target to see if we can reach source
      const seen = new Set<string>();
      const stack = [target];
      while (stack.length) {
        const n = stack.pop()!;
        if (n === source) return false; // cycle detected
        if (seen.has(n)) continue;
        seen.add(n);
        const nxt = adj.get(n) || [];
        for (const m of nxt) stack.push(m);
      }
      return true;
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

  const nodeTypes = {
    text: TextNode,
    image: ImageNode,
    combine: CombineNode,
    generate: GenerateNode,
  } as const;

  const addNode = (type: keyof typeof nodeTypes) => {
    const id = nanoid(8);
    const position = { x: 200 + doc.nodes.length * 40, y: 120 + doc.nodes.length * 20 };
    let data: any;
    switch (type) {
      case "text":
        data = { kind: "text", text: "" };
        break;
      case "image":
        data = { kind: "image" };
        break;
      case "combine":
        data = { kind: "combine" };
        break;
      case "generate":
        data = { kind: "generate", status: "idle" };
        break;
    }
    const node: FlowNode = { id, type, position, data } as unknown as FlowNode;
    setDoc({ ...doc, nodes: [...doc.nodes, node as any] });
    setDirty(true);
  };

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

      <div className="h-[calc(100vh-56px)] relative">
        <section className="relative w-full h-full">
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 p-2 rounded-md text-white bg-black">
            <button
              className="h-9 w-9 flex items-center justify-center rounded border border-white/10 bg-transparent hover:bg-white/10"
              onClick={() => addNode("text")}
              aria-label="Add text"
              title="Add text"
            >
              <Type className="h-4 w-4" />
            </button>
            <button
              className="h-9 w-9 flex items-center justify-center rounded border border-white/10 bg-transparent hover:bg-white/10"
              onClick={() => addNode("image")}
              aria-label="Add image"
              title="Add image"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <button
              className="h-9 w-9 flex items-center justify-center rounded border border-white/10 bg-transparent hover:bg-white/10"
              onClick={() => addNode("combine")}
              aria-label="Add combine"
              title="Add combine"
            >
              <GitMerge className="h-4 w-4" />
            </button>
            <button
              className="h-9 w-9 flex items-center justify-center rounded border border-white/10 bg-transparent hover:bg-white/10"
              onClick={() => addNode("generate")}
              aria-label="Add generate"
              title="Add generate"
            >
              <Wand2 className="h-4 w-4" />
            </button>
          </div>
          <div className="absolute inset-0">
            <div className="w-full h-full">
              <Canvas
                nodes={doc.nodes as unknown as FlowNode[]}
                edges={doc.edges as unknown as FlowEdge[]}
                onChange={handleCanvasChange}
                nodeTypes={nodeTypes as any}
                isValidConnection={isValidConnection as any}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
