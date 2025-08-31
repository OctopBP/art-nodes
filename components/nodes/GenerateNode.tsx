"use client";

import { Handle, Position, type NodeProps, useNodeId, useReactFlow, useStore } from "@xyflow/react";
import { useMemo } from "react";

export default function GenerateNode({ data }: NodeProps) {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);

  const inputs = useMemo(() => {
    if (!nodeId) return { text: undefined as string | undefined, combined: undefined as { text?: string; imageDataUrl?: string } | undefined };
    const incoming = edges.filter((e) => e.target === nodeId);
    let text: string | undefined;
    let combined: { text?: string; imageDataUrl?: string } | undefined;
    for (const e of incoming) {
      const src = nodes.find((n) => n.id === e.source);
      if (!src) continue;
      if (e.targetHandle?.endsWith(":string")) {
        if (src.type === "text") {
          text = (src.data as any)?.text ?? text;
        } else if (src.type === "combine") {
          text = (src.data as any)?.combined?.text ?? text;
        }
      } else if (e.targetHandle?.endsWith(":combined")) {
        if (src.type === "combine") {
          const t = (src.data as any)?.combined?.text as string | undefined;
          const img = (src.data as any)?.combined?.imageDataUrl as string | undefined;
          combined = { text: t, imageDataUrl: img };
        }
      }
    }
    return { text, combined };
  }, [edges, nodes, nodeId]);

  const outputImageDataUrl: string | undefined = (data as any)?.outputImageDataUrl;
  const ready = Boolean(inputs.text) || Boolean(inputs.combined?.text);

  return (
    <div className="rounded-md border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur p-3 text-sm min-w-64">
      <div className="font-medium mb-2">Generate</div>
      <div className="space-y-2">
        <button
          className="rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5"
          disabled={!ready}
          onClick={() => {
            // Placeholder: generation integration comes later
          }}
        >
          Generate
        </button>

        {!ready && <div className="text-xs text-gray-500">Connect Text or Combined input.</div>}

        {outputImageDataUrl ? (
          <div className="mt-2">
            <img src={outputImageDataUrl} alt="output" className="max-w-[240px] max-h-[180px] rounded-md border border-black/10 dark:border-white/10" />
            <div className="mt-2 flex gap-2">
              <a
                href={outputImageDataUrl}
                download="generated.png"
                className="nodrag nopan rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5"
              >
                Download PNG
              </a>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-500">No output yet.</div>
        )}
      </div>

      <Handle id="in:string" type="target" position={Position.Left} style={{ top: 24 }} />
      <Handle id="in:combined" type="target" position={Position.Left} style={{ top: 48 }} />
      <Handle id="out:image" type="source" position={Position.Right} />
    </div>
  );
}
