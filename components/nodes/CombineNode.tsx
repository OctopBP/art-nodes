"use client";

import { Position, type NodeProps, useNodeId, useReactFlow, useStore, type Node as RFNode } from "@xyflow/react";
import { makeHandleId } from "@/lib/ports";
import { useEffect } from "react";
import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from "@/components/base-node";
import { LabeledHandle } from "@/components/labeled-handle";
import type { CombineNodeData, Combined, NodeData } from "@/lib/schemas";

type CombineRuntimeData = CombineNodeData & { combined?: Combined };

export default function CombineNode({ data }: NodeProps<RFNode<CombineRuntimeData>>) {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();
  const inputs = useStore(
    (s) => {
      if (!nodeId) return { strings: [] as string[], images: [] as (string | undefined)[] };
      const incoming = s.edges.filter((e) => e.target === nodeId);
      const strings: string[] = [];
      const images: (string | undefined)[] = [];
      for (const e of incoming) {
        const src = s.nodes.find((n) => n.id === e.source);
        const d = (src?.data as NodeData | undefined);
        if (!d) continue;
        switch (d.kind) {
          case "text": {
            const t = d.text;
            if (t) strings.push(t);
            break;
          }
          case "image": {
            const img = d.imageDataUrl;
            if (img) images.push(img);
            break;
          }
          case "combine": {
            const t = d.combined?.text;
            const img = d.combined?.imageDataUrl;
            if (t) strings.push(t);
            if (img) images.push(img);
            break;
          }
          case "generate": {
            const img = d.outputImageDataUrl;
            if (img) images.push(img);
            break;
          }
        }
      }
      return { strings, images };
    },
    (a, b) =>
      a.strings.length === b.strings.length &&
      a.images.length === b.images.length &&
      a.strings.every((v, i) => v === b.strings[i]) &&
      a.images.every((v, i) => v === b.images[i])
  );

  useEffect(() => {
    if (!nodeId) return;
    const text = inputs.strings.length ? inputs.strings.join("\n") : undefined;
    const imageDataUrl = inputs.images.find(Boolean) || undefined;
    const prevCombined = data?.combined as { text?: string; imageDataUrl?: string } | undefined;
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
