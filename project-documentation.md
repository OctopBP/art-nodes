**Project Documentation**

**Purpose**
- **Goal:** Web app for artists to compose AI image workflows from nodes (Text, Image, Combine, Generate), manage multiple documents, and configure an API key for generation.
- **Output:** Generated images as PNG with preview and download.

**Scope**
- **MVP Screens:** Documents list, Document editor (React Flow), Settings.
- **Nodes:** Text, Image, Combine, Generate.
- **Persistence:** IndexedDB for documents, images, and settings; typed via Zod.
- **AI:** Google @google/genai image generation.

**Tech Stack**
- **Framework:** Next.js (App Router), React 18, TypeScript.
- **Graph:** `@xyflow/react` v12 (React Flow 12).
- **State:** `zustand` with `persist` (storage adapter targets IndexedDB).
- **Schemas:** `zod` for runtime validation and type inference.
- **UI:** shadcn/ui + Tailwind CSS, `@tabler/icons-react` for icons.
- **AI SDK:** `@google/genai` for image generation.
- **HTTP:** `ky` for URL image fetches and any future REST calls.
- **IDs:** `nanoid` for stable IDs.

**Routing**
- `/` → redirects to `/documents`.
- `/documents` → list with create, open, delete.
- `/documents/[id]` → full-screen editor with React Flow.
- `/settings` → set and persist `GOOGLE_AI_API_KEY` and model options.

**Project Layout**
- `app/(routes)/documents/page.tsx`
- `app/(routes)/documents/[id]/page.tsx`
- `app/(routes)/settings/page.tsx`
- `components/nodes/TextNode.tsx`
- `components/nodes/ImageNode.tsx`
- `components/nodes/CombineNode.tsx`
- `components/nodes/GenerateNode.tsx`
- `components/flow/Canvas.tsx`
- `components/flow/Toolbar.tsx`
- `lib/types.ts`
- `lib/graph.ts` (execution and helpers)
- `lib/genai.ts` (Google AI wrapper)
- `lib/storage.ts` (storage abstraction)
- `store/documents.ts`
- `store/settings.ts`

**Data Model**
- **Document:**
  - `id: string`, `title: string`, `createdAt: number`, `updatedAt: number`
  - `nodes: ReactFlowNode[]`, `edges: ReactFlowEdge[]`
- **Port Types:** `string`, `image`, `combined`
- **Combined Payload:** `{ text?: string; imageDataUrl?: string }`

**Zod Schemas**
- These schemas validate persisted data and infer TS types.

```
import { z } from 'zod'

export const ZPortType = z.enum(['string', 'image', 'combined'])

export const ZCombined = z.object({
  text: z.string().optional(),
  imageDataUrl: z.string().url().startsWith('data:image/').optional(),
})

export const ZTextNodeData = z.object({
  kind: z.literal('text'),
  text: z.string().default(''),
  output: z.string().optional(),
})

export const ZImageNodeData = z.object({
  kind: z.literal('image'),
  imageDataUrl: z.string().url().startsWith('data:image/').optional(),
  source: z.enum(['file', 'url']).optional(),
  filename: z.string().optional(),
})

export const ZCombineNodeData = z.object({
  kind: z.literal('combine'),
})

export const ZGenerateNodeData = z.object({
  kind: z.literal('generate'),
  model: z.string().optional(),
  size: z.enum(['512x512', '768x768', '1024x1024']).optional(),
  status: z.enum(['idle', 'loading', 'done', 'error']).default('idle'),
  outputImageDataUrl: z.string().url().startsWith('data:image/png').optional(),
  error: z.string().optional(),
  lastInputsHash: z.string().optional(),
})

export const ZNodeData = z.discriminatedUnion('kind', [
  ZTextNodeData,
  ZImageNodeData,
  ZCombineNodeData,
  ZGenerateNodeData,
])

export const ZRFPosition = z.object({ x: z.number(), y: z.number() })

export const ZRFNode = z.object({
  id: z.string(),
  type: z.string(),
  position: ZRFPosition,
  data: ZNodeData,
})

export const ZRFEdge = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
})

export const ZDocument = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  nodes: z.array(ZRFNode),
  edges: z.array(ZRFEdge),
})
```

Notes:
- URLs validated with `startsWith('data:image/')` for data URLs; PNG outputs use `data:image/png` specifically.
- We use discriminated unions for node data by `kind`.

**Graph Rules**
- **Connections:** Enforce compatible types via `isValidConnection`:
  - `string → string`, `image → image`, `string|image → combined`, `string|combined → generate`.
- **Cycles:** Prevent cycles at connect time.
- **Propagation:**
  - Synchronous nodes (Text, Image, Combine) compute immediately when inputs/data change.
  - Generate runs only on button click; caches by inputs hash.

**Node Behaviors**
- **Text Node:**
  - No inputs; output `string`. UI: textarea. Updates propagate.
- **Image Node:**
  - No inputs; output `image`. UI: upload file or fetch from URL (via `ky`). Convert to PNG data URL; display preview.
- **Combine Node:**
  - Multiple `string` and `image` inputs; output `combined`. Combines text as newline-joined string; picks first image (MVP).
- **Generate Node:**
  - Input accepts `string` or `combined`. Output `image`. UI: Generate button, status, preview, Download PNG. Uses Google AI wrapper.

**Google AI Integration**
- `lib/genai.ts` exposes:
  - `initClient(apiKey: string)` → configured client instance.
  - `generateImage({ prompt, imageDataUrl?, model?, size? })` → `{ dataUrl: string /* PNG */ }`.
- Model default subject to SDK capability; configurable in settings.
- Client-side key usage is for MVP; production should proxy via server.

**Storage (IndexedDB)**
- Use IndexedDB as the primary storage for documents, images, and settings to avoid localStorage size limits.
- **Library:** `idb-keyval` for a minimal, promise-based API.
- **DB Structure:** Single DB with separate stores (namespaces):
  - `documents`: individual documents by `id` (including nodes/edges and light metadata).
  - `thumbnails`: cached PNG thumbnails by `documentId`.
  - `settings`: key-value (e.g., `GOOGLE_AI_API_KEY`, model preference).
- **API (`lib/storage.ts`):**
  - `getDocuments(): Promise<ZDocument[]>`
  - `getDocument(id: string): Promise<ZDocument | undefined>`
  - `putDocument(doc: ZDocument): Promise<void>` (validate with Zod before write)
  - `deleteDocument(id: string): Promise<void>`
  - `getSetting<T>(key: string): Promise<T | undefined>`
  - `setSetting<T>(key: string, value: T): Promise<void>`
  - Implementation uses `idb-keyval` `createStore('artnodes', 'documents')` etc.
- **Persistence Strategy:**
  - Editor debounces saves (e.g., 500ms) on node/edge changes and on title edits.
  - Large images stored as data URLs under ~5–10MB each; if needed, move to binary Blobs and object URLs later.

**State Management**
- `store/settings.ts` (zustand):
  - `apiKey`, `model`, actions to set; persisted via custom IndexedDB adapter that conforms to zustand `persist` storage.
- `store/documents.ts` (zustand):
  - In-memory cache of open document; CRUD operations call `lib/storage.ts`.
  - List view loads all docs via `getDocuments()` on mount.

**UI & UX**
- **Documents List:** cards/rows with title, updated time; actions: Open, Delete (confirm), Create New.
- **Editor:** full-screen canvas, left toolbar to add nodes, right property panel (optional), zoom controls, snap-to-grid optional.
- **Settings:** API key input with visibility toggle; save; optional test button.
- **Download:** from Generate node; disabled when no output.
- **Validation:** toasts via shadcn/ui for errors; inline messages on nodes.

**Security Notes**
- Client-side API key storage is not secure; use a server proxy for production. We will clearly label this in the UI.

**Milestones**
- M1: Scaffold app, routing, base UI
- M2: Settings and IndexedDB persistence (adapter + schemas)
- M3: Documents list CRUD
- M4: Flow canvas + Text/Image/Combine nodes
- M5: Generate node + Google AI integration
- M6: Polish: download, validation, UX

**Open Questions**
- Default Google model for image generation? (SDK-supported image model)
- Preferred image size presets (512, 768, 1024)?
- Combine behavior for multiple images beyond first?

**Next Steps**
- Scaffold the Next.js app and install dependencies.
- Implement IndexedDB storage adapter and Zod schemas in `lib/`.
- Build Settings and Documents screens.
