"use client";

import { Handle, Position, type NodeProps, useNodeId, useReactFlow, useStore } from "@xyflow/react";
import { makeHandleId } from "@/lib/ports";
import { useMemo, useState } from "react";
import { useSettingsStore } from "@/store/settings";
import { generateImage } from "@/lib/genai";

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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ready = Boolean(inputs.text) || Boolean(inputs.combined?.text);

  return (
    <div className="rounded-md border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur p-3 text-sm min-w-64">
      <div className="font-medium mb-2">Generate</div>
      <div className="space-y-2">
        <button
          className="rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5"
          disabled={!ready || busy}
          onClick={async () => {
            if (!nodeId) return;
            const prompt = inputs.combined?.text ?? inputs.text ?? "";
            const refImg = inputs.combined?.imageDataUrl;
            const apiKey = useSettingsStore.getState().apiKey;
            const model = useSettingsStore.getState().model || "imagen-3.0";
            if (!apiKey) {
              setErr("Missing GOOGLE_AI_API_KEY in Settings");
              return;
            }
            setBusy(true);
            setErr(null);
            setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: "loading" } } : n)));
            try {
              const { dataUrl } = await generateImage({ apiKey, model, prompt, referenceImageDataUrl: refImg, size: "1024x1024" });
              setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: "done", outputImageDataUrl: dataUrl } } : n)));
            } catch (e) {
              const msg = (e as Error).message || "Failed to generate image";
              setErr(msg);
              setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: "error", error: msg } } : n)));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Generating…" : "Generate"}
        </button>

        {!ready && <div className="text-xs text-gray-500">Connect Text or Combined input.</div>}
        {err && <div className="text-xs text-red-600">{err}</div>}

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

      <Handle id={makeHandleId("in", "string")} type="target" position={Position.Left} style={{ top: 24 }} />
      <Handle id={makeHandleId("in", "combined")} type="target" position={Position.Left} style={{ top: 48 }} />
      <Handle id={makeHandleId("out", "image")} type="source" position={Position.Right} />
    </div>
  );
}
