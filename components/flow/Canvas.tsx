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
import { useReactFlow } from "@xyflow/react";
import { BackgroundVariant } from "@xyflow/react";
import type { ReactFlowProps } from "@xyflow/react";
import { useCallback, useEffect, useRef } from "react";
import RemovableEdge from "@/components/flow/RemovableEdge";
import { AddNodeToolbar } from "@/components/flow/AddNodeToolbar";
import type { NodeTypeKey } from "@/components/flow/nodeRegistry";

type CanvasProps = {
  nodes?: Node[];
  edges?: Edge[];
  onChange?: (nodes: Node[], edges: Edge[]) => void;
  nodeTypes?: ReactFlowProps['nodeTypes'];
  isValidConnection?: ReactFlowProps['isValidConnection'];
  edgeTypes?: ReactFlowProps['edgeTypes'];
  onAddNode?: (type: NodeTypeKey, position?: { x: number; y: number }) => void;
};

export default function Canvas({ nodes = [], edges = [], onChange, nodeTypes, isValidConnection, edgeTypes, onAddNode }: CanvasProps) {
  const [rfNodes, setRfNodes] = useNodesState(nodes);
  const [rfEdges, setRfEdges] = useEdgesState(edges);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
      // Only emit meaningful structural changes. Ignore dimension/selection churn and
      // skip mid-drag position updates.
      const hasMeaningfulChange = changes.some((c) =>
        c.type === 'add' ||
        c.type === 'remove' ||
        c.type === 'replace' ||
        c.type === 'position'
      );
      const hasPositionChange = changes.some((c) => c.type === 'position');
      shouldEmitRef.current = hasMeaningfulChange && (!isDraggingRef.current || !hasPositionChange);
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
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
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
        <AddAtCenterOverlay onAddNode={onAddNode} containerRef={containerRef} />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <MiniMap pannable zoomable />
        <Controls position="bottom-left" />
      </ReactFlow>
    </div>
  );
}

function AddAtCenterOverlay({ onAddNode, containerRef }: { onAddNode?: (type: NodeTypeKey, position?: { x: number; y: number }) => void; containerRef: React.RefObject<HTMLDivElement | null> }) {
  const rf = useReactFlow();
  const handleAddAtCenter = useCallback((type: NodeTypeKey) => {
    if (!onAddNode) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const centerScreen = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const centerFlow = rf.screenToFlowPosition(centerScreen);
    onAddNode(type, centerFlow);
  }, [onAddNode, rf, containerRef]);
  return <AddNodeToolbar onAdd={handleAddAtCenter} />;
}
