"use client";

import { Position, type NodeProps, useNodeId, useReactFlow, useStore, type Node as RFNode } from "@xyflow/react";
import { makeHandleId } from "@/lib/ports";
import { useEffect, useRef, useState, startTransition } from "react";
import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from "@/components/base-node";
import { LabeledHandle } from "@/components/labeled-handle";
import type { AddTextNodeData, Combined, NodeData } from "@/lib/schemas";
import { Trash } from "lucide-react";
import { Button } from "../ui/button";

type AddTextRuntimeData = AddTextNodeData & { combined?: Combined };

export default function AddTextNode({ data }: NodeProps<RFNode<AddTextRuntimeData>>) {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();
  const [value, setValue] = useState<string>(data?.text ?? "");
  const debounceRef = useRef<number | null>(null);

  // keep local state in sync if external data changes (e.g., load, undo)
  useEffect(() => {
    const external = data?.text ?? "";
    if (external !== value) setValue(external);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.text]);

  const inputs = useStore(
    (s) => {
      if (!nodeId) return { images: [] as (string | undefined)[] };
      const incoming = s.edges.filter((e) => e.target === nodeId);
      const images: (string | undefined)[] = [];
      for (const e of incoming) {
        const src = s.nodes.find((n) => n.id === e.source);
        const d = (src?.data as NodeData | undefined);
        if (!d) continue;
        switch (d.kind) {
          case "image": {
            const img = d.imageDataUrl;
            if (img) images.push(img);
            break;
          }
          case "combine": {
            const img = d.combined?.imageDataUrl;
            if (img) images.push(img);
            break;
          }
          case "generate": {
            const img = d.outputImageDataUrl;
            if (img) images.push(img);
            break;
          }
          // ignore plain text nodes; text is provided via local field
        }
      }
      return { images };
    },
    (a, b) => a.images.length === b.images.length && a.images.every((v, i) => v === b.images[i])
  );

  const flushTextToStore = (next: string) => {
    if (!nodeId) return;
    startTransition(() => {
      setNodes((nodes) => nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, text: next } } : n)));
    });
  };

  const scheduleFlush = (next: string) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    debounceRef.current = window.setTimeout(() => flushTextToStore(next), 120);
  };

  useEffect(() => () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current!);
  }, []);

  useEffect(() => {
    if (!nodeId) return;
    const text = (data as AddTextNodeData | undefined)?.text || value || undefined;
    const imageDataUrl = inputs.images.find(Boolean) || undefined;
    const prevCombined = data?.combined as { text?: string; imageDataUrl?: string } | undefined;
    const nextCombined = { text, imageDataUrl };
    const equal = prevCombined?.text === nextCombined.text && prevCombined?.imageDataUrl === nextCombined.imageDataUrl;
    if (equal) return;
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, combined: nextCombined } } : n)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inputs.images.join(","), nodeId, setNodes]);

  const hasImage = Boolean(inputs.images.find(Boolean));

  return (
    <BaseNode className="min-w-64">
      <BaseNodeHeader className="border-b">
        <BaseNodeHeaderTitle>Add text</BaseNodeHeaderTitle>
        <Button
          variant="ghost"
          className="nodrag p-1"
          onClick={() => {
            if (!nodeId) return;
            setNodes((ns) => ns.filter((n) => n.id !== nodeId));
          }}
          aria-label="Delete Node"
          title="Delete Node"
        >
          <Trash className="size-4" />
        </Button>
      </BaseNodeHeader>
      <div className="px-3 py-2 flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          <LabeledHandle id={makeHandleId("in", "image")} type="target" position={Position.Left} title="image" labelClassName="text-[10px] text-foreground/70" />
        </div>
        <LabeledHandle id={makeHandleId("out", "combined")} type="source" position={Position.Right} title="combined" labelClassName="text-[10px] text-foreground/70" />
      </div>
      <BaseNodeContent>
        <textarea
          className="nodrag nopan w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
          rows={3}
          placeholder="Type text to add..."
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            setValue(next);
            scheduleFlush(next);
          }}
          onBlur={() => flushTextToStore(value)}
        />
        <div className="mt-1 text-xs text-muted-foreground">Image: {hasImage ? "yes" : "no"}</div>
      </BaseNodeContent>
    </BaseNode>
  );
}

