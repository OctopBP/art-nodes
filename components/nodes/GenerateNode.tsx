"use client";

import type { NodeProps } from "@xyflow/react";

export default function GenerateNode(_: NodeProps) {
  return (
    <div className="rounded-md border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur px-3 py-2 text-sm">
      <div className="font-medium">Generate</div>
      <div className="text-xs text-gray-500">placeholder</div>
    </div>
  );
}

