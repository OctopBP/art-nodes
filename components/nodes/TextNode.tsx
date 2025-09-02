'use client'

import { Trash } from 'lucide-react'
import {
    BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle
} from '@/components/base-node'
import { LabeledHandle } from '@/components/labeled-handle'
import { makeHandleId } from '@/lib/ports'
import { type NodeProps, Position, useNodeId, useReactFlow, type Node as RFNode } from '@xyflow/react'
import type { TextNodeData } from '@/lib/schemas'
import { Button } from '../ui/button'

export default function TextNode({ data }: NodeProps<RFNode<TextNodeData>>) {
  const nodeId = useNodeId()
  const { setNodes } = useReactFlow()

  const onChange = (value: string) => {
    if (!nodeId) return
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, text: value } } : n
      )
    )
  }

  return (
    <BaseNode className='w-72'>
      <BaseNodeHeader className='border-b'>
        <BaseNodeHeaderTitle>Text</BaseNodeHeaderTitle>
        <Button
          variant='ghost'
          className='nodrag p-1'
          onClick={() => {
            if (!nodeId) return
            setNodes((ns) => ns.filter((n) => n.id !== nodeId))
          }}
          aria-label='Delete Node'
          title='Delete Node'
        >
          <Trash className='size-4' />
        </Button>
      </BaseNodeHeader>

      <div className='px-0 py-2 flex justify-between'>
        <div />
        <LabeledHandle
          id={makeHandleId('out', 'string')}
          type='source'
          position={Position.Right}
				  title='string'
				  labelClassName="text-[10px] text-foreground/70"
        />
      </div>

      <BaseNodeContent>
        <textarea
          className='nodrag nopan w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20'
          rows={4}
          placeholder='Type prompt text...'
          value={data?.text ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      </BaseNodeContent>
    </BaseNode>
  )
}
