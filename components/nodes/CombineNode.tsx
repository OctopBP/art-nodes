"use client";

import { Handle, Position, NodeResizer, NodeToolbar, type NodeProps, useNodeId, useReactFlow, useStore } from "@xyflow/react";
import { makeHandleId } from "@/lib/ports";
import { useEffect, useMemo } from "react";

export default function CombineNode({ data }: NodeProps) {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);

  const inputs = useMemo(() => {
    if (!nodeId) return { strings: [] as string[], images: [] as (string | undefined)[] };
    const incoming = edges.filter((e) => e.target === nodeId);
    const sources = incoming
      .map((e) => nodes.find((n) => n.id === e.source))
      .filter(Boolean) as typeof nodes;

    const strings: string[] = [];
    const images: (string | undefined)[] = [];
    for (const n of sources) {
      if (n.type === "text") {
        const t = (n.data as any)?.text as string | undefined;
        if (t) strings.push(t);
      } else if (n.type === "image") {
        const img = (n.data as any)?.imageDataUrl as string | undefined;
        if (img) images.push(img);
      } else if (n.type === "combine") {
        const t = (n.data as any)?.combined?.text as string | undefined;
        const img = (n.data as any)?.combined?.imageDataUrl as string | undefined;
        if (t) strings.push(t);
        if (img) images.push(img);
      } else if (n.type === "generate") {
        const img = (n.data as any)?.outputImageDataUrl as string | undefined;
        if (img) images.push(img);
      }
    }
    return { strings, images };
  }, [edges, nodes, nodeId]);

  useEffect(() => {
    if (!nodeId) return;
    const text = inputs.strings.length ? inputs.strings.join("\n") : undefined;
    const imageDataUrl = inputs.images.find(Boolean) || undefined;
    const prevCombined = (data as any)?.combined as { text?: string; imageDataUrl?: string } | undefined;
    const nextCombined = { text, imageDataUrl };
    const equal = prevCombined?.text === nextCombined.text && prevCombined?.imageDataUrl === nextCombined.imageDataUrl;
    if (equal) return;
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, combined: nextCombined } } : n)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs.strings.join("\n"), inputs.images.join(","), nodeId, setNodes]);

  const stringsCount = inputs.strings.length;
  const hasImage = Boolean(inputs.images.find(Boolean));

  return (
    <div className="relative rounded-md border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur text-sm min-w-56">
      <NodeResizer minWidth={224} minHeight={120} handleClassName="border border-black/20 dark:border-white/20" />
      <NodeToolbar isVisible={useStore((s) => !!s.nodes.find((n) => n.id === nodeId)?.selected)} position="top" align="center">
        <button
          className="nodrag nopan text-xs rounded border border-black/10 dark:border-white/10 px-2 py-1 bg-white/80 dark:bg-black/60 hover:bg-black/5 dark:hover:bg-white/10"
          onClick={() => {
            if (!nodeId) return;
            setNodes((ns) => ns.filter((n) => n.id !== nodeId));
          }}
        >
          Remove
        </button>
      </NodeToolbar>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/10 dark:border-white/10">
        <div className="font-medium">Combine</div>
        <button
          className="nodrag nopan text-xs rounded border border-black/10 dark:border-white/10 px-1.5 hover:bg-black/5 dark:hover:bg-white/5"
          onClick={() => {
            if (!nodeId) return;
            setNodes((ns) => ns.filter((n) => n.id !== nodeId));
          }}
          aria-label="Remove node"
        >
          ×
        </button>
      </div>
      {/* IO Section */}
      <div className="relative h-16">
        <div className="absolute left-[-6px] top-[12px] -translate-y-1/2 text-[10px] text-gray-500 select-none">string</div>
        <Handle id={makeHandleId("in", "string")} type="target" position={Position.Left} style={{ top: 12 }} />
        <div className="absolute left-[-6px] top-[36px] -translate-y-1/2 text-[10px] text-gray-500 select-none">image</div>
        <Handle id={makeHandleId("in", "image")} type="target" position={Position.Left} style={{ top: 36 }} />
        <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 text-[10px] text-gray-500 select-none">combined</div>
        <Handle id={makeHandleId("out", "combined")} type="source" position={Position.Right} />
        <div className="w-full h-px bg-black/10 dark:bg-white/10 absolute bottom-0 left-0" />
      </div>
      {/* Content */}
      <div className="p-3 text-xs text-gray-500">Strings: {stringsCount} • Image: {hasImage ? "yes" : "no"}</div>
    </div>
  );
}
