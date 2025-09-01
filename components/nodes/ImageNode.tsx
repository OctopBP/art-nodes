"use client";

import { Position, type NodeProps, useNodeId, useReactFlow } from "@xyflow/react";
import { makeHandleId } from "@/lib/ports";
import { BaseNode, BaseNodeHeader, BaseNodeHeaderTitle, BaseNodeContent } from "@/components/base-node";
import { LabeledHandle } from "@/components/labeled-handle";
import type { ImageNodeData } from "@/lib/schemas";


async function imageBitmapToPngDataUrl(bitmap: ImageBitmap): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  ctx.drawImage(bitmap, 0, 0);
  return canvas.toDataURL("image/png");
}

async function fileToPngDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  return imageBitmapToPngDataUrl(bitmap);
}

async function urlToPngDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  return imageBitmapToPngDataUrl(bitmap);
}

export default function ImageNode({ data }: NodeProps<ImageNodeData>) {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();

  const setImage = (imageDataUrl?: string, filename?: string, error?: string) => {
    if (!nodeId) return;
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, imageDataUrl, filename, source: filename ? "file" : (imageDataUrl ? "url" : undefined), error } }
          : n
      )
    );
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      const png = await fileToPngDataUrl(file);
      setImage(png, file.name, undefined);
    } catch (e) {
      setImage(undefined, undefined, (e as Error).message);
    }
  };

  const onLoadUrl = async (urlInput: string) => {
    const url = urlInput.trim();
    if (!url) return;
    try {
      const png = await urlToPngDataUrl(url);
      setImage(png, undefined, undefined);
    } catch (e) {
      setImage(undefined, undefined, (e as Error).message);
    }
  };

  const imageDataUrl: string | undefined = data?.imageDataUrl;
  const filename: string | undefined = data?.filename;
  const error: string | undefined = (data as any)?.error;

  return (
    <BaseNode className="min-w-64">
      <BaseNodeHeader className="border-b">
        <BaseNodeHeaderTitle>Image</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <div className="px-3 py-2 flex justify-between">
        <div />
        <LabeledHandle
          id={makeHandleId("out", "image")}
          type="source"
          position={Position.Right}
				  title="image"
				  labelClassName="text-[10px] text-foreground/70"
        />
      </div>
      
      <BaseNodeContent className="space-y-2">
        <label className="block text-xs text-gray-500">Upload file</label>
        <input
          className="nodrag nopan block w-full text-xs"
          type="file"
          accept="image/*"
          onChange={(e) => onFile(e.target.files?.[0])}
        />

        <div className="flex items-center gap-2">
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            className="nodrag nopan w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const target = e.target as HTMLInputElement;
                onLoadUrl(target.value);
              }
            }}
          />
          <button
            className="nodrag nopan rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5"
            onClick={(e) => {
              const input = (e.currentTarget.previousSibling as HTMLInputElement) ?? null;
              if (input && input.tagName === "INPUT") {
                onLoadUrl((input as HTMLInputElement).value);
              }
            }}
          >
            Load
          </button>
        </div>

        {error && <div className="text-xs text-red-600">{error}</div>}

        {imageDataUrl ? (
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1 truncate" title={filename || "image.png"}>
              {filename || "image.png"}
            </div>
            <img
              src={imageDataUrl}
              alt={filename || "image"}
              className="max-w-[240px] max-h-[180px] rounded-md border border-black/10 dark:border-white/10"
            />
            <div className="mt-2 flex gap-2">
              <button
                className="nodrag nopan rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                onClick={() => setImage(undefined, undefined, undefined)}
              >
                Clear
              </button>
              <a
                href={imageDataUrl}
                download={filename || "image.png"}
                className="nodrag nopan rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5"
              >
                Download PNG
              </a>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-500">No image selected</div>
        )}
      </BaseNodeContent>
    </BaseNode>
  );
}
