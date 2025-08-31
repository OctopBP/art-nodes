"use client";

import { Handle, Position, type NodeProps, useNodeId, useReactFlow } from "@xyflow/react";
import { makeHandleId } from "@/lib/ports";

export default function TextNode({ data }: NodeProps) {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();

  const onChange = (value: string) => {
    if (!nodeId) return;
    setNodes((nodes) =>
      nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, text: value } } : n))
    );
  };

  return (
    <div className="rounded-md border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur p-3 text-sm min-w-56">
      <div className="font-medium mb-2">Text</div>
      <textarea
        className="nodrag nopan w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
        rows={4}
        placeholder="Type prompt text..."
        value={(data as any)?.text ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      <Handle id={makeHandleId("out", "string")} type="source" position={Position.Right} />
    </div>
  );
}
