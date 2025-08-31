"use client";

import { Handle, Position, NodeToolbar, NodeResizer, type NodeProps, useNodeId, useReactFlow, useStore } from "@xyflow/react";
import { makeHandleId } from "@/lib/ports";
import { BaseNode, BaseNodeContent, BaseNodeFooter, BaseNodeHeader, BaseNodeHeaderTitle } from "@/components/base-node";

export default function TextNode({ data }: NodeProps) {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();

  const onChange = (value: string) => {
    if (!nodeId) return;
    setNodes((nodes) =>
      nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, text: value } } : n))
    );
  };
  const selected = useStore((s) => !!s.nodes.find((n) => n.id === nodeId)?.selected);

  return (
    <BaseNode className="min-w-56">
      <NodeResizer minWidth={224} minHeight={140} handleClassName="border border-black/20 dark:border-white/20" />
      <NodeToolbar isVisible={selected} position="top" align="center">
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
      <BaseNodeHeader className="border-b">
        <BaseNodeHeaderTitle>Text</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <div className="relative h-10 px-3 grid items-center">
        <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 text-[10px] text-gray-500 select-none">text</div>
        <Handle id={makeHandleId("out", "string")} type="source" position={Position.Right} />
        <div className="w-full h-px bg-black/10 dark:bg-white/10 absolute bottom-0 left-0" />
      </div>
      <BaseNodeContent>
        <textarea
          className="nodrag nopan w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
          rows={4}
          placeholder="Type prompt text..."
          value={(data as any)?.text ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </BaseNodeContent>
    </BaseNode>
  );
}
