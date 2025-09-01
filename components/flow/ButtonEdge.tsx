"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import React from "react";

export default function ButtonEdge(props: EdgeProps & { children?: React.ReactNode }) {
  const {
    id,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    style,
    markerEnd,
    markerStart,
    children,
  } = props;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeStyle = {
    stroke: "#94a3b8",
    strokeWidth: 1.5,
    ...(style || {}),
  } as React.CSSProperties;

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} markerStart={markerStart} style={edgeStyle} />
      <EdgeLabelRenderer>
        <div
          className="group absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          {children}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

