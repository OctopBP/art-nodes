"use client";

import "@xyflow/react/dist/style.css";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useCallback, useEffect } from "react";

type CanvasProps = {
  nodes?: Node[];
  edges?: Edge[];
  onChange?: (nodes: Node[], edges: Edge[]) => void;
};

export default function Canvas({ nodes = [], edges = [], onChange }: CanvasProps) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(nodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(edges);

  const onConnect = useCallback(
    (connection: Connection) => setRfEdges((eds) => addEdge(connection, eds)),
    []
  );

  useEffect(() => {
    onChange?.(rfNodes, rfEdges);
  }, [rfNodes, rfEdges, onChange]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background variant="dots" gap={16} size={1} />
        <MiniMap pannable zoomable />
        <Controls position="bottom-left" />
      </ReactFlow>
    </div>
  );
}

