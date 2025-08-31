"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDocumentsStore } from "@/store/documents";
import type { DocumentT } from "@/lib/schemas";
import Canvas from "@/components/flow/Canvas";
import type { Edge as RFEdge, Node as RFNode } from "@xyflow/react";
import { useCallback } from "react";
import TextNode from "@/components/nodes/TextNode";
import ImageNode from "@/components/nodes/ImageNode";
import CombineNode from "@/components/nodes/CombineNode";
import GenerateNode from "@/components/nodes/GenerateNode";
import { nanoid } from "nanoid";
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
  const isValidConnection = useCallback((conn: { sourceHandle?: string | null; targetHandle?: string | null }) => {
    const sh = conn.sourceHandle ?? "";
    const th = conn.targetHandle ?? "";
    const sType = sh.split(":")[1];
    const tType = th.split(":")[1];
    if (!sType || !tType) return true; // allow by default if unspecified
    if (sType === "string" && tType === "string") return true;
    if (sType === "image" && tType === "image") return true;
    if (sType === "combined" && tType === "combined") return true;
    return false;
  }, []);

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

      <div className="h-[calc(100vh-56px)] grid grid-cols-[240px_1fr]">
        <aside className="border-r border-black/10 dark:border-white/10 p-4">
          <div className="text-sm font-medium mb-2">Toolbar</div>
          <div className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
            <button className="block w-full text-left rounded border border-black/10 dark:border-white/10 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => addNode("text")}>
              + Text Node
            </button>
            <button className="block w-full text-left rounded border border-black/10 dark:border-white/10 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => addNode("image")}>
              + Image Node
            </button>
            <button className="block w-full text-left rounded border border-black/10 dark:border-white/10 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => addNode("combine")}>
              + Combine Node
            </button>
            <button className="block w-full text-left rounded border border-black/10 dark:border-white/10 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => addNode("generate")}>
              + Generate Node
            </button>
          </div>
        </aside>
        <section className="relative">
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
