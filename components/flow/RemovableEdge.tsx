"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getEdgeCenter,
  type EdgeProps,
  useReactFlow,
} from "@xyflow/react";

export default function RemovableEdge(props: EdgeProps) {
  const {
    id,
    path,
    markerEnd,
    markerStart,
    style,
    sourceX,
    sourceY,
    targetX,
    targetY,
    labelX,
    labelY,
  } = props;

  const { setEdges } = useReactFlow();

  const [cx, cy] =
    typeof labelX === "number" && typeof labelY === "number"
      ? [labelX, labelY]
      : getEdgeCenter({ sourceX, sourceY, targetX, targetY });

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} markerStart={markerStart} style={style} />
      <EdgeLabelRenderer>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEdges((eds) => eds.filter((e) => e.id !== id));
          }}
          className="nodrag nopan absolute rounded bg-white/80 dark:bg-black/60 border border-black/10 dark:border-white/10 text-xs px-1.5 py-0.5 shadow opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
          style={{
            transform: `translate(-50%, -50%) translate(${cx}px, ${cy}px)`,
            pointerEvents: "all",
          }}
        >
          ×
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
