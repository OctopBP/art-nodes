"use client";

import { memo, useCallback, useEffect, useRef } from 'react'
import { AddNodeToolbar } from '@/components/flow/AddNodeToolbar'
import RemovableEdge from '@/components/flow/RemovableEdge'
import {
    addEdge, applyEdgeChanges, applyNodeChanges, Background, BackgroundVariant, Connection,
    Controls, Edge, EdgeChange, MiniMap, Node, NodeChange, ReactFlow, useEdgesState, useNodesState,
    useReactFlow
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import type { ReactFlowProps } from "@xyflow/react";
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

function CanvasImpl({ nodes = [], edges = [], onChange, nodeTypes, isValidConnection, edgeTypes, onAddNode }: CanvasProps) {
  const [rfNodes, setRfNodes] = useNodesState(nodes);
  const [rfEdges, setRfEdges] = useEdgesState(edges);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keep latest refs to avoid stale closures
  const onChangeRef = useRef(onChange);
  const shouldEmitRef = useRef(false);
  const isDraggingRef = useRef(false);
  const lastEmitRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync external props into internal state when they change
  // Use shallow comparison to avoid unnecessary updates
  useEffect(() => {
    const nodesChanged = JSON.stringify(nodes) !== JSON.stringify(rfNodes);
    if (nodesChanged) {
      setRfNodes(nodes);
    }
  }, [nodes, rfNodes, setRfNodes]);

  useEffect(() => {
    const edgesChanged = JSON.stringify(edges) !== JSON.stringify(rfEdges);
    if (edgesChanged) {
      setRfEdges(edges);
    }
  }, [edges, rfEdges, setRfEdges]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setRfNodes((prev) => {
      const next = applyNodeChanges(changes, prev);
      
      // Only emit meaningful structural changes
      const hasStructuralChange = changes.some((c) =>
        c.type === 'add' ||
        c.type === 'remove' ||
        c.type === 'replace'
      );
      
      const hasPositionChange = changes.some((c) => c.type === 'position');
      
      // Emit immediately for structural changes, defer position changes until drag stops
      if (hasStructuralChange) {
        shouldEmitRef.current = true;
      } else if (hasPositionChange && !isDraggingRef.current) {
        shouldEmitRef.current = true;
      }
      
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

  // Emit changes with debouncing to avoid excessive updates
  useEffect(() => {
    if (shouldEmitRef.current) {
      shouldEmitRef.current = false;
      
      // Check if the data actually changed to avoid unnecessary emissions
      const currentData = { nodes: rfNodes, edges: rfEdges };
      const lastData = lastEmitRef.current;
      
      if (!lastData || 
          JSON.stringify(currentData.nodes) !== JSON.stringify(lastData.nodes) ||
          JSON.stringify(currentData.edges) !== JSON.stringify(lastData.edges)) {
        lastEmitRef.current = currentData;
        onChangeRef.current?.(rfNodes, rfEdges);
      }
    }
  }, [rfNodes, rfEdges]);

  const handleNodeDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleNodeDragStop = useCallback(() => {
    isDraggingRef.current = false;
    // Emit a single sync after drag completes
    shouldEmitRef.current = true;
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        fitView
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        edgeTypes={{ removable: RemovableEdge, ...(edgeTypes || {}) }}
        defaultEdgeOptions={{
          type: "removable",
          style: { stroke: "#94a3b8", strokeWidth: 1.5 },
        }}
        deleteKeyCode={["Delete", "Backspace"]}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        selectNodesOnDrag={false}
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

// Memoize the Canvas component to prevent unnecessary re-renders
const Canvas = memo(CanvasImpl, (prevProps, nextProps) => {
  // Only re-render if nodes, edges, or callbacks actually changed
  return (
    JSON.stringify(prevProps.nodes) === JSON.stringify(nextProps.nodes) &&
    JSON.stringify(prevProps.edges) === JSON.stringify(nextProps.edges) &&
    prevProps.onChange === nextProps.onChange &&
    prevProps.onAddNode === nextProps.onAddNode &&
    prevProps.isValidConnection === nextProps.isValidConnection
  );
});

export default Canvas;
