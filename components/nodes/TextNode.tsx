"use client"

import { Trash } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import {
    BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle
} from '@/components/base-node'
import { LabeledHandle } from '@/components/labeled-handle'
import { makeHandleId } from '@/lib/ports'
import { Node as RFNode, NodeProps, Position, useNodeId, useReactFlow } from '@xyflow/react'
import { Button } from '../ui/button'

import type { TextNodeData } from '@/lib/schemas'
function TextNodeImpl({ data }: NodeProps<RFNode<TextNodeData>>) {
  const nodeId = useNodeId()
  const { setNodes } = useReactFlow()
  const [value, setValue] = useState<string>(data?.text ?? '')
  const [isFocused, setIsFocused] = useState(false)
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Keep local state in sync if external data changes (e.g., load, undo)
  // but never overwrite while the user is actively typing in this field
  useEffect(() => {
    if (isFocused) return
    const external = data?.text ?? ''
    if (external !== value) {
      setValue(external)
    }
  }, [data?.text, isFocused, value])

  const flushToStore = useCallback((next: string) => {
    if (!nodeId) return
    
    // Clear any pending flush
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current)
    }
    
    // Use requestAnimationFrame to ensure DOM updates are complete
    requestAnimationFrame(() => {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, text: next } } : n
        )
      )
    })
  }, [nodeId, setNodes])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value
    setValue(next)
    
    // Clear any pending flush
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current)
    }
    
    // Debounce the flush to store
    flushTimeoutRef.current = setTimeout(() => {
      flushToStore(next)
    }, 300)
  }, [flushToStore])

  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    // Clear any pending flush and flush immediately
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current)
    }
    flushToStore(value)
  }, [value, flushToStore])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault()
      // Clear any pending flush and flush immediately
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current)
      }
      flushToStore(value)
    }
  }, [value, flushToStore])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current)
      }
    }
  }, [])

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
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
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
