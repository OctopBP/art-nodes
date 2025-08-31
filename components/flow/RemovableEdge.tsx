"use client";

import { BaseEdge, EdgeLabelRenderer, type EdgeProps, useReactFlow } from "@xyflow/react";

export default function RemovableEdge(props: EdgeProps) {
  const { id, path } = props;
  const { setEdges } = useReactFlow();

  return (
    <>
      <BaseEdge {...props} />
      <EdgeLabelRenderer>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEdges((eds) => eds.filter((e) => e.id !== id));
          }}
          className="nodrag nopan absolute -translate-x-1/2 -translate-y-1/2 rounded bg-white/80 dark:bg-black/60 border border-black/10 dark:border-white/10 text-xs px-1.5 py-0.5 shadow"
          style={{
            transform: `translate(-50%, -50%)`,
            pointerEvents: "all",
            // position at center of edge path
            left: `${props.labelX ?? 0}px`,
            top: `${props.labelY ?? 0}px`,
          }}
        >
          ×
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

