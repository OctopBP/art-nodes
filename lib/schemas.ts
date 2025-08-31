import { z } from "zod";

export const ZPortType = z.enum(["string", "image", "combined"]);

export const ZCombined = z.object({
  text: z.string().optional(),
  imageDataUrl: z
    .string()
    .refine((s) => s.startsWith("data:image/"), {
      message: "Must be an image data URL",
    })
    .optional(),
});

export const ZTextNodeData = z.object({
  kind: z.literal("text"),
  text: z.string().default(""),
  output: z.string().optional(),
});

export const ZImageNodeData = z.object({
  kind: z.literal("image"),
  imageDataUrl: z
    .string()
    .refine((s) => s.startsWith("data:image/"), {
      message: "Must be an image data URL",
    })
    .optional(),
  source: z.enum(["file", "url"]).optional(),
  filename: z.string().optional(),
});

export const ZCombineNodeData = z.object({
  kind: z.literal("combine"),
});

export const ZGenerateNodeData = z.object({
  kind: z.literal("generate"),
  model: z.string().optional(),
  size: z.enum(["512x512", "768x768", "1024x1024"]).optional(),
  status: z.enum(["idle", "loading", "done", "error"]).default("idle"),
  outputImageDataUrl: z
    .string()
    .refine((s) => s.startsWith("data:image/png"), {
      message: "Must be a PNG data URL",
    })
    .optional(),
  error: z.string().optional(),
  lastInputsHash: z.string().optional(),
});

export const ZNodeData = z.discriminatedUnion("kind", [
  ZTextNodeData,
  ZImageNodeData,
  ZCombineNodeData,
  ZGenerateNodeData,
]);

export const ZRFPosition = z.object({ x: z.number(), y: z.number() });

export const ZRFNode = z.object({
  id: z.string(),
  type: z.string(),
  position: ZRFPosition,
  data: ZNodeData,
});

export const ZRFEdge = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const ZDocument = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  nodes: z.array(ZRFNode),
  edges: z.array(ZRFEdge),
});

export type PortType = z.infer<typeof ZPortType>;
export type Combined = z.infer<typeof ZCombined>;
export type TextNodeData = z.infer<typeof ZTextNodeData>;
export type ImageNodeData = z.infer<typeof ZImageNodeData>;
export type CombineNodeData = z.infer<typeof ZCombineNodeData>;
export type GenerateNodeData = z.infer<typeof ZGenerateNodeData>;
export type NodeData = z.infer<typeof ZNodeData>;
export type RFNode = z.infer<typeof ZRFNode>;
export type RFEdge = z.infer<typeof ZRFEdge>;
export type DocumentT = z.infer<typeof ZDocument>;

