import type { Connection } from "@xyflow/react";
import type { PortType } from "@/lib/schemas";

export type PortDir = "in" | "out";

export type ParsedHandle = {
  dir?: PortDir;
  type?: PortType;
  raw?: string | null;
};

// Format: `${dir}:${type}` e.g., "out:string", "in:image"
export function makeHandleId(dir: PortDir, type: PortType): string {
  return `${dir}:${type}`;
}

export function parseHandleId(id?: string | null): ParsedHandle {
  if (!id) return { raw: id };
  const [dir, type] = id.split(":");
  if ((dir === "in" || dir === "out") && (type === "string" || type === "image" || type === "combined")) {
    return { dir, type: type as PortType, raw: id };
  }
  return { raw: id };
}

export function isPortCompatible(source?: PortType, target?: PortType): boolean {
  if (!source || !target) return true;
  return source === target;
}

export function isValidConnectionByHandles(connection: Connection): boolean {
  const s = parseHandleId(connection.sourceHandle);
  const t = parseHandleId(connection.targetHandle);
  return isPortCompatible(s.type, t.type);
}

