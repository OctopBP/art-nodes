"use client"

import { Trash } from 'lucide-react'
import {
    BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle
} from '@/components/base-node'
import { LabeledHandle } from '@/components/labeled-handle'
import { makeHandleId } from '@/lib/ports'
import { type NodeProps, Position, useNodeId, useReactFlow, type Node as RFNode } from '@xyflow/react'
import type { TextNodeData } from '@/lib/schemas'
import { Button } from '../ui/button'
import { memo, useEffect, useState, startTransition } from 'react'

function TextNodeImpl({ data }: NodeProps<RFNode<TextNodeData>>) {
  const nodeId = useNodeId()
  const { setNodes } = useReactFlow()
  const [value, setValue] = useState<string>(data?.text ?? '')
  const [isFocused, setIsFocused] = useState(false)

  // keep local state in sync if external data changes (e.g., load, undo)
  // but never overwrite while the user is actively typing in this field
  useEffect(() => {
    if (isFocused) return
    const external = data?.text ?? ''
    if (external !== value) setValue(external)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.text, isFocused])

  const flushToStore = (next: string) => {
    if (!nodeId) return
    startTransition(() => {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, text: next } } : n
        )
      )
    })
  }

  // Intentionally do not persist while typing; only on explicit events (blur/save)

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
          value={value}
          autoComplete='off'
          autoCorrect='off'
          spellCheck={false}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const next = e.target.value
            setValue(next)
            // no-op: do not write to store while typing
          }}
          onInput={(e) => {
            const next = (e.target as HTMLTextAreaElement).value
            if (next !== value) setValue(next)
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => { flushToStore(value); setIsFocused(false) }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
              e.preventDefault()
              flushToStore(value)
            }
          }}
        />
      </BaseNodeContent>
    </BaseNode>
  )
}

const TextNode = memo(TextNodeImpl, (prev, next) => {
  // While focused, ignore prop changes to avoid interrupting typing
  const prevText = (prev.data?.text ?? '')
  const nextText = (next.data?.text ?? '')
  return prevText === nextText
})

export default TextNode
