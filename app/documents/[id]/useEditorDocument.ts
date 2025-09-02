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
  const [saving, setSaving] = useState(false);
  const lastSigRef = useRef<string | null>(null);

  const makeSig = useCallback((nodes: FlowNode[], edges: FlowEdge[]): string => {
    const nodeSig = nodes
      .map((n) => {
        const d = n.data as NodeData | undefined;
        const kind = d?.kind ?? "";
        const t = (d && 'text' in d && typeof d.text === 'string') ? (d.text as string) : '';
        const imgLen = (d && 'imageDataUrl' in d && typeof d.imageDataUrl === 'string') ? (d.imageDataUrl as string).length : 0;
        const outLen = (d && 'outputImageDataUrl' in d && typeof d.outputImageDataUrl === 'string') ? (d.outputImageDataUrl as string).length : 0;
        return `${n.id}|${String(n.type ?? '')}|${n.position.x},${n.position.y}|${kind}|t:${t.length}|i:${imgLen}|o:${outLen}`;
      })
      .join(";");
    const edgeSig = edges.map((e) => `${e.id}|${e.source}>${e.target}|${e.sourceHandle ?? ''}|${e.targetHandle ?? ''}`).join(";");
    return `${nodeSig}#${edgeSig}`;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const d = await get(id);
        if (!mounted) return;
        if (d) {
          // One-time normalization: ensure node.type is set (fallback to data.kind)
          const needsNormalize = d.nodes.some((n) => !n.type && (n.data as NodeData | undefined)?.kind);
          if (needsNormalize) {
            const normalized: DocumentT = {
              ...d,
              nodes: d.nodes.map((n) => ({
                ...n,
                type: n.type || ((n.data as NodeData | undefined)?.kind ?? ""),
              })),
            };
            setDoc(normalized);
            setDirty(true);
          } else {
            setDoc(d);
          }
        }
        else setError("Document not found");
      } catch (e) {
        if (mounted) setError((e as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [get, id]);

  const saveNow = useCallback(async () => {
    if (!doc) return;
    setSaving(true);
    try {
      await save(doc);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [doc, save]);

  const handleCanvasChange = useCallback((nodes: FlowNode[], edges: FlowEdge[]) => {
    const toSchemaNode = (n: FlowNode): SchemaRFNode => {
      const data = n.data as NodeData | undefined;
      const inferredType = (typeof n.type === "string" && n.type) ? n.type : (data?.kind ?? "");
      return {
        id: n.id,
        type: inferredType,
        position: { x: n.position.x, y: n.position.y },
        data: (n.data as NodeData),
      };
    };
    const toSchemaEdge = (e: FlowEdge): SchemaRFEdge => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
    });
    const newNodes = nodes.map(toSchemaNode);
    const newEdges = edges.map(toSchemaEdge);
    const newSig = makeSig(nodes, edges);
    if (lastSigRef.current === newSig) {
      return;
    }
    lastSigRef.current = newSig;
    setDoc((prev) => (prev ? { ...prev, nodes: newNodes, edges: newEdges } : prev));
    setDirty(true);
  }, [makeSig]);

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

  return { doc, setDoc, loading, error, dirty, saving, setDirty, handleCanvasChange, addNode, setTitle, saveNow } as const;
}
