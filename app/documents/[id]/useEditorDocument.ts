"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useDocumentsStore } from "@/store/documents";
import type { DocumentT, NodeData, RFNode as SchemaRFNode, RFEdge as SchemaRFEdge } from "@/lib/schemas";
import type { Edge as RFEdge, Node as RFNode } from "@xyflow/react";
import { createDefaultNodeData, type NodeTypeKey } from "@/components/flow/nodeRegistry";

type FlowNode = RFNode;
type FlowEdge = RFEdge;

export function useEditorDocument(id: string) {
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
        if (d) setDoc(d);
        else setError("Document not found");
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

  useEffect(() => {
    if (!doc || !dirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await save(doc);
      setDirty(false);
    }, 500);
  }, [doc, dirty, save]);

  const handleCanvasChange = useCallback((nodes: FlowNode[], edges: FlowEdge[]) => {
    const toSchemaNode = (n: FlowNode): SchemaRFNode => ({
      id: n.id,
      type: String(n.type || ""),
      position: { x: n.position.x, y: n.position.y },
      data: (n.data as NodeData),
    });
    const toSchemaEdge = (e: FlowEdge): SchemaRFEdge => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
    });
    setDoc((prev) => (prev ? { ...prev, nodes: nodes.map(toSchemaNode), edges: edges.map(toSchemaEdge) } : prev));
    setDirty(true);
  }, []);

  const addNode = useCallback((type: NodeTypeKey) => {
    if (!doc) return;
    const idStr = nanoid(8);
    const position = { x: 200 + doc.nodes.length * 40, y: 120 + doc.nodes.length * 20 };
    const data = createDefaultNodeData(type);
    const node: SchemaRFNode = { id: idStr, type, position, data };
    setDoc({ ...doc, nodes: [...doc.nodes, node] });
    setDirty(true);
  }, [doc]);

  const setTitle = useCallback((title: string) => {
    if (!doc) return;
    setDoc({ ...doc, title });
    setDirty(true);
  }, [doc]);

  return { doc, setDoc, loading, error, dirty, setDirty, handleCanvasChange, addNode, setTitle } as const;
}
