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
    <div className="relative rounded-md border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur p-3 text-sm min-w-56">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Text</div>
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
      <textarea
        className="nodrag nopan w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
        rows={4}
        placeholder="Type prompt text..."
        value={(data as any)?.text ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 text-[10px] text-gray-500 select-none">text</div>
      <Handle id={makeHandleId("out", "string")} type="source" position={Position.Right} />
    </div>
  );
}
