import type { Connection, Edge } from "@xyflow/react";

/**
 * Returns true if adding `connection` to `edges` would create a cycle.
 */
export function createsCycle(connection: Connection, edges: ReadonlyArray<Edge>): boolean {
  const source = connection.source;
  const target = connection.target;
  if (!source || !target) return false;

  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
  }
  if (!adj.has(source)) adj.set(source, []);
  adj.get(source)!.push(target);

  const seen = new Set<string>();
  const stack = [target];
  while (stack.length) {
    const n = stack.pop()!;
    if (n === source) return true;
    if (seen.has(n)) continue;
    seen.add(n);
    const next = adj.get(n) || [];
    for (const m of next) stack.push(m);
  }
  return false;
}

