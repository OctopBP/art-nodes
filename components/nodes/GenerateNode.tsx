'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
    BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle
} from '@/components/base-node'
import { LabeledHandle } from '@/components/labeled-handle'
import { NodeStatusIndicator } from '@/components/node-status-indicator'
import { DEFAULT_MODEL } from '@/lib/config'
import { generateImage } from '@/lib/genai'
import { makeHandleId } from '@/lib/ports'
import { useSettingsStore } from '@/store/settings'
import {
    type Node as RFNode, type NodeProps, Position, useNodeId, useReactFlow, useStore
} from '@xyflow/react'

import type { GenerateNodeData, NodeData } from '@/lib/schemas'
export default function GenerateNode({
  data,
}: NodeProps<RFNode<GenerateNodeData>>) {
  const nodeId = useNodeId()
  const { setNodes } = useReactFlow()
  const inputs = useStore(
    (s) => {
      if (!nodeId)
        return {
          text: undefined as string | undefined,
          combined: undefined as { text?: string; imageDataUrl?: string } | undefined,
        }
      const incoming = s.edges.filter((e) => e.target === nodeId)
      let text: string | undefined
      let combined: { text?: string; imageDataUrl?: string } | undefined
      for (const e of incoming) {
        const src = s.nodes.find((n) => n.id === e.source)
        const d = src?.data as NodeData | undefined
        if (!d) continue
        if (e.targetHandle?.endsWith(':string')) {
          if (d.kind === 'text') {
            text = d.text ?? text
          } else if (d.kind === 'combine') {
            text = d.combined?.text ?? text
          }
        } else if (e.targetHandle?.endsWith(':combined')) {
          if (d.kind === 'combine') {
            combined = {
              text: d.combined?.text,
              imageDataUrl: d.combined?.imageDataUrl,
            }
          }
        }
      }
      return { text, combined }
    },
    (a, b) => a.text === b.text && a.combined?.text === b.combined?.text && a.combined?.imageDataUrl === b.combined?.imageDataUrl
  )

  const outputImageDataUrl: string | undefined = data?.outputImageDataUrl
  const lastInputsHash: string | undefined = data?.lastInputsHash
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const ready = Boolean(inputs.text) || Boolean(inputs.combined?.text)
  const currentSize = (data as GenerateNodeData | undefined)?.size || '1024x1024'

  const setSize = (size: string) => {
    if (!nodeId) return
    setNodes((ns) =>
      ns.map((n) =>
        n.id === nodeId ? { ...n, data: { ...(n.data as NodeData), size } } : n
      )
    )
  }

  const status = busy
    ? 'loading'
    : err
    ? 'error'
    : outputImageDataUrl
    ? 'success'
    : 'initial'

  return (
    <NodeStatusIndicator status={status} variant='border'>
      <BaseNode className='min-w-64'>
        <BaseNodeHeader className='border-b'>
          <BaseNodeHeaderTitle>Generate</BaseNodeHeaderTitle>
        </BaseNodeHeader>
        <div className='px-3 py-2 flex items-start justify-between gap-2'>
          <div className='flex flex-col gap-2'>
            <LabeledHandle
              id={makeHandleId('in', 'string')}
              type='target'
              position={Position.Left}
              title='string'
              labelClassName='text-[10px] text-foreground/70'
            />
            <LabeledHandle
              id={makeHandleId('in', 'combined')}
              type='target'
              position={Position.Left}
              title='combined'
              labelClassName='text-[10px] text-foreground/70'
            />
          </div>
          <LabeledHandle
            id={makeHandleId('out', 'image')}
            type='source'
            position={Position.Right}
            title='image'
            labelClassName='text-[10px] text-foreground/70'
          />
        </div>
        <BaseNodeContent className='space-y-2'>
          <div className='flex items-center gap-2'>
            <label className='text-[11px] text-foreground/70'>Aspect</label>
            <select
              className='rounded-md border border-black/10 dark:border-white/10 px-1.5 py-1 text-xs bg-transparent'
              value={currentSize}
              onChange={(e) => setSize(e.target.value)}
              title='Aspect ratio (maps to WxH size)'
            >
              {/* Long side ~1024 to keep sizes sane */}
              <option value='1024x1024'>1:1 (1024x1024)</option>
              <option value='768x1024'>3:4 (768x1024)</option>
              <option value='1024x768'>4:3 (1024x768)</option>
              <option value='720x1280'>9:16 (720x1280)</option>
              <option value='1280x720'>16:9 (1280x720)</option>
            </select>
          </div>
          <button
            className='rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5'
            disabled={!ready || busy}
            onClick={async () => {
              if (!nodeId) return
              const prompt = inputs.combined?.text ?? inputs.text ?? ''
              const refImg = inputs.combined?.imageDataUrl
              const apiKey = useSettingsStore.getState().apiKey
              const model = useSettingsStore.getState().model || DEFAULT_MODEL
              const preferPlaceholderOn429 =
                useSettingsStore.getState().placeholderOnRateLimit
              if (!apiKey) {
                setErr('Missing GOOGLE_AI_API_KEY in Settings')
                return
              }

              // Simple caching by input signature
              const signature = JSON.stringify({
                prompt,
                refImg,
                model,
                size: currentSize,
              })
              if (
                lastInputsHash &&
                lastInputsHash === signature &&
                outputImageDataUrl
              ) {
                // Up-to-date; no-op
                return
              }
              setBusy(true)
              setErr(null)
              setNodes((ns) =>
                ns.map((n) =>
                  n.id === nodeId
                    ? { ...n, data: { ...n.data, status: 'loading' } }
                    : n
                )
              )
              try {
                // Prefer server route (can use Images API to honor size)
                let dataUrl: string | undefined
                try {
                  const res = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      apiKey, // falls back to server env if omitted; sending keeps current UX
                      model,
                      prompt,
                      referenceImageDataUrl: refImg,
                      size: currentSize,
                      preferPlaceholderOn429,
                    }),
                  })
                  if (res.ok) {
                    const json = (await res.json()) as { dataUrl?: string }
                    dataUrl = json?.dataUrl
                  } else {
                    throw new Error('API route failed')
                  }
                } catch {
                  // Fallback to client-side SDK path (may ignore size)
                  const r = await generateImage({
                    apiKey,
                    model,
                    prompt,
                    referenceImageDataUrl: refImg,
                    size: currentSize as `${number}x${number}`,
                    preferPlaceholderOn429,
                  })
                  dataUrl = r.dataUrl
                }
                if (!dataUrl) throw new Error('No image data returned')
                setNodes((ns) =>
                  ns.map((n) =>
                    n.id === nodeId
                      ? {
                          ...n,
                          data: {
                            ...n.data,
                            status: 'done',
                            outputImageDataUrl: dataUrl!,
                            lastInputsHash: signature,
                            size: currentSize,
                          },
                        }
                      : n
                  )
                )
              } catch (e) {
                const msg = (e as Error).message || 'Failed to generate image'
                setErr(msg)
                setNodes((ns) =>
                  ns.map((n) =>
                    n.id === nodeId
                      ? {
                          ...n,
                          data: { ...n.data, status: 'error', error: msg },
                        }
                      : n
                  )
                )
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Generating…' : 'Generate'}
          </button>

          {!ready && (
            <div className='text-xs text-gray-500'>
              Connect Text or Combined input.
            </div>
          )}
          {err && <div className='text-xs text-red-600'>{err}</div>}

          {outputImageDataUrl ? (
            <div className='mt-2'>
              <div className='relative w-[240px] h-[180px] rounded-md border border-black/10 dark:border-white/10'>
                <Image
                  src={outputImageDataUrl}
                  alt='output'
                  fill
                  sizes='240px'
                  unoptimized
                  className='object-contain'
                />
              </div>
              <div className='mt-2 flex gap-2'>
                <a
                  href={outputImageDataUrl}
                  download='generated.png'
                  className='nodrag nopan rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5'
                >
                  Download PNG
                </a>
              </div>
              {lastInputsHash && (
                <div className='mt-1 text-[10px] text-gray-500'>
                  Cached for current inputs
                </div>
              )}
            </div>
          ) : (
            <div className='text-xs text-gray-500'>No output yet.</div>
          )}
        </BaseNodeContent>
      </BaseNode>
    </NodeStatusIndicator>
  )
}
