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
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import { BackgroundVariant } from "@xyflow/react";
import type { ReactFlowProps } from "@xyflow/react";
import { useCallback, useEffect, useRef } from "react";
import RemovableEdge from "@/components/flow/RemovableEdge";

type CanvasProps = {
  nodes?: Node[];
  edges?: Edge[];
  onChange?: (nodes: Node[], edges: Edge[]) => void;
  nodeTypes?: ReactFlowProps['nodeTypes'];
  isValidConnection?: ReactFlowProps['isValidConnection'];
  edgeTypes?: ReactFlowProps['edgeTypes'];
};

export default function Canvas({ nodes = [], edges = [], onChange, nodeTypes, isValidConnection, edgeTypes }: CanvasProps) {
  const [rfNodes, setRfNodes] = useNodesState(nodes);
  const [rfEdges, setRfEdges] = useEdgesState(edges);

  // Keep latest refs to avoid stale closures
  const onChangeRef = useRef(onChange);
  const nodesRef = useRef<Node[]>(rfNodes);
  const edgesRef = useRef<Edge[]>(rfEdges);
  const shouldEmitRef = useRef(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    nodesRef.current = rfNodes;
  }, [rfNodes]);

  useEffect(() => {
    edgesRef.current = rfEdges;
  }, [rfEdges]);

  // Sync external props into internal state when they change
  useEffect(() => {
    setRfNodes(nodes);
  }, [nodes, setRfNodes]);
  useEffect(() => {
    setRfEdges(edges);
  }, [edges, setRfEdges]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setRfNodes((prev) => {
      const next = applyNodeChanges(changes, prev);
      // Avoid spamming external onChange while dragging positions
      const hasPositionChange = changes.some((c) => c.type === 'position');
      shouldEmitRef.current = !isDraggingRef.current || !hasPositionChange;
      return next;
    });
  }, [setRfNodes]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setRfEdges((prev) => {
      const next = applyEdgeChanges(changes, prev);
      shouldEmitRef.current = true;
      return next;
    });
  }, [setRfEdges]);

  const onConnect = useCallback((connection: Connection) => {
    setRfEdges((eds) => {
      const next = addEdge(connection, eds);
      shouldEmitRef.current = true;
      return next;
    });
  }, [setRfEdges]);

  // Emit external change only after internal state updates commit
  useEffect(() => {
    if (shouldEmitRef.current) {
      shouldEmitRef.current = false;
      onChangeRef.current?.(rfNodes, rfEdges);
    }
  }, [rfNodes, rfEdges]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={() => { isDraggingRef.current = true; }}
        onNodeDragStop={() => {
          isDraggingRef.current = false;
          // Emit a single sync after drag completes
          onChangeRef.current?.(nodesRef.current, edgesRef.current);
        }}
        fitView
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        edgeTypes={{ removable: RemovableEdge, ...(edgeTypes || {}) }}
        defaultEdgeOptions={{
          type: "removable",
          style: { stroke: "#94a3b8", strokeWidth: 1.5 },
        }}
        deleteKeyCode={["Delete", "Backspace"]}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <MiniMap pannable zoomable />
        <Controls position="bottom-left" />
      </ReactFlow>
    </div>
  );
}
