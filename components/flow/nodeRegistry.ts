"use client";

import CombineNode from "@/components/nodes/CombineNode";
import GenerateNode from "@/components/nodes/GenerateNode";
import ImageNode from "@/components/nodes/ImageNode";
import TextNode from "@/components/nodes/TextNode";
import type { NodeData } from "@/lib/schemas";

export const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  combine: CombineNode,
  generate: GenerateNode,
} as const;

export type NodeTypeKey = keyof typeof nodeTypes;

export function createDefaultNodeData(type: NodeTypeKey): NodeData {
  switch (type) {
    case "text":
      return { kind: "text", text: "" };
    case "image":
      return { kind: "image" } as NodeData;
    case "combine":
      return { kind: "combine" } as NodeData;
    case "generate":
      return { kind: "generate", status: "idle", size: "1024x1024" } as NodeData;
  }
}
