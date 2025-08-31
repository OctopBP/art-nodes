import { cn } from "@/lib/utils";
import { NodeResizer, NodeToolbar, useNodeId, useReactFlow, useStore } from "@xyflow/react";
import { PropsWithChildren } from "react";

export function BaseNode({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn("relative rounded-md border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur text-sm", className)}>
      {children}
    </div>
  );
}

export function BaseNodeHeader({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn("flex items-center gap-2 px-3 py-2", className)}>{children}</div>
  );
}

export function BaseNodeHeaderTitle({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("font-medium", className)}>{children}</div>;
}

export function BaseNodeContent({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("p-3", className)}>{children}</div>;
}

export function BaseNodeFooter({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("p-3 flex items-center gap-2", className)}>{children}</div>;
}

