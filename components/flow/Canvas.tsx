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
import { useCallback, useEffect, useRef } from "react";

type CanvasProps = {
  nodes?: Node[];
  edges?: Edge[];
  onChange?: (nodes: Node[], edges: Edge[]) => void;
  nodeTypes?: Record<string, React.ComponentType<any>>;
  isValidConnection?: (connection: Connection) => boolean;
};

export default function Canvas({ nodes = [], edges = [], onChange, nodeTypes, isValidConnection }: CanvasProps) {
  const [rfNodes, setRfNodes] = useNodesState(nodes);
  const [rfEdges, setRfEdges] = useEdgesState(edges);

  // Keep latest refs to avoid stale closures
  const onChangeRef = useRef(onChange);
  const nodesRef = useRef<Node[]>(rfNodes);
  const edgesRef = useRef<Edge[]>(rfEdges);
  const shouldEmitRef = useRef(false);

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
      shouldEmitRef.current = true;
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
  }, []);

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
        fitView
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
      >
        <Background variant="dots" gap={16} size={1} />
        <MiniMap pannable zoomable />
        <Controls position="bottom-left" />
      </ReactFlow>
    </div>
  );
}
