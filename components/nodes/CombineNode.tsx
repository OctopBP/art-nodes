"use client";

import { Position, type NodeProps, useNodeId, useReactFlow, useStore } from "@xyflow/react";
import { makeHandleId } from "@/lib/ports";
import { useEffect, useMemo } from "react";
import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from "@/components/base-node";
import { LabeledHandle } from "@/components/labeled-handle";

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
    <BaseNode className="min-w-56">
      <BaseNodeHeader className="border-b">
        <BaseNodeHeaderTitle>Combine</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <div className="px-3 py-2 flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          <LabeledHandle id={makeHandleId("in", "string")} type="target" position={Position.Left} title="string" labelClassName="text-[10px] text-foreground/70" />
          <LabeledHandle id={makeHandleId("in", "image")} type="target" position={Position.Left} title="image" labelClassName="text-[10px] text-foreground/70" />
        </div>
        <LabeledHandle id={makeHandleId("out", "combined")} type="source" position={Position.Right} title="combined" labelClassName="text-[10px] text-foreground/70" />
      </div>
      <BaseNodeContent className="text-xs text-muted-foreground">
        Strings: {stringsCount} • Image: {hasImage ? "yes" : "no"}
      </BaseNodeContent>
    </BaseNode>
  );
}
