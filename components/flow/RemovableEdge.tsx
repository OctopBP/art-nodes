"use client";

import type { EdgeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import ButtonEdge from "@/components/flow/ButtonEdge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function RemovableEdge(props: EdgeProps) {
  const { id } = props;
  const { setEdges } = useReactFlow();
  return (
    <ButtonEdge {...props}>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setEdges((eds) => eds.filter((e) => e.id !== id));
          }}
          className="h-6 w-6 rounded-full p-0 bg-background/80"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </ButtonEdge>
  );
}
