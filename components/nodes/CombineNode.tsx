"use client";

import { Handle, Position, type NodeProps, useNodeId, useReactFlow, useStore } from "@xyflow/react";
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
    const combinedText = inputs.strings.join("\n");
    const firstImage = inputs.images.find(Boolean);
    const prevCombined = (data as any)?.combined as { text?: string; imageDataUrl?: string } | undefined;
    if (prevCombined?.text === combinedText && prevCombined?.imageDataUrl === firstImage) return;
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, combined: { text: combinedText || undefined, imageDataUrl: firstImage } } } : n)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs.strings, inputs.images, nodeId, setNodes]);

  const stringsCount = inputs.strings.length;
  const hasImage = Boolean(inputs.images.find(Boolean));

  return (
    <div className="rounded-md border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur p-3 text-sm min-w-56">
      <div className="font-medium mb-2">Combine</div>
      <div className="text-xs text-gray-500">Strings: {stringsCount} • Image: {hasImage ? "yes" : "no"}</div>
      <Handle id="in:string" type="target" position={Position.Left} style={{ top: 24 }} />
      <Handle id="in:image" type="target" position={Position.Left} style={{ top: 48 }} />
      <Handle id="out:combined" type="source" position={Position.Right} />
    </div>
  );
}
