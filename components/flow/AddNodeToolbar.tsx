"use client";

import { GitMerge, Image as ImageIcon, Type, Wand2, Plus } from "lucide-react";
import type { NodeTypeKey } from "@/components/flow/nodeRegistry";

export function AddNodeToolbar({ onAdd }: { onAdd: (type: NodeTypeKey) => void }) {
  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 p-2 rounded-md text-white bg-black">
      <button
        className="h-9 w-9 flex items-center justify-center rounded border border-white/10 bg-transparent hover:bg-white/10"
        onClick={() => onAdd("text")}
        aria-label="Add text"
        title="Add text"
      >
        <Type className="h-4 w-4" />
      </button>
      <button
        className="h-9 w-9 flex items-center justify-center rounded border border-white/10 bg-transparent hover:bg-white/10"
        onClick={() => onAdd("image")}
        aria-label="Add image"
        title="Add image"
      >
        <ImageIcon className="h-4 w-4" />
      </button>
      <button
        className="h-9 w-9 flex items-center justify-center rounded border border-white/10 bg-transparent hover:bg-white/10"
        onClick={() => onAdd("combine")}
        aria-label="Add combine"
        title="Add combine"
      >
        <GitMerge className="h-4 w-4" />
      </button>
      <button
        className="h-9 w-9 flex items-center justify-center rounded border border-white/10 bg-transparent hover:bg-white/10"
        onClick={() => onAdd("addText")}
        aria-label="Add Add text"
        title="Add Add text"
      >
        <div className="relative">
          <Type className="h-4 w-4" />
          <Plus className="absolute -right-1 -bottom-1 h-3 w-3" />
        </div>
      </button>
      <button
        className="h-9 w-9 flex items-center justify-center rounded border border-white/10 bg-transparent hover:bg-white/10"
        onClick={() => onAdd("generate")}
        aria-label="Add generate"
        title="Add generate"
      >
        <Wand2 className="h-4 w-4" />
      </button>
    </div>
  );
}
