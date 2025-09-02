// Lightweight wrapper around Google AI image generation.
// Tries @google/genai first, then @google/generative-ai, with a safe fallback that generates
// a local placeholder PNG when the SDK or network is unavailable (useful in dev).

export type GenerateImageParams = {
  apiKey: string;
  model: string; // e.g., 'imagen-3.0-generate-001'
  prompt: string;
  referenceImageDataUrl?: string; // optional image conditioning
  size?: `${number}x${number}`; // hint/resolution, if supported by the model
  preferPlaceholderOn429?: boolean; // if true, don't wait long retry; return placeholder
  preferImagesApi?: boolean; // if true and server-side, try Images API first
};

export async function generateImage(params: GenerateImageParams): Promise<{ dataUrl: string }> {
  // Try the official SDK first; only fall back to placeholder when SDK is missing.
  const mod: unknown = await import("@google/genai").catch(() => null);
  if (mod) {
    // Prefer GoogleGenAI per current SDK versions
    const m = mod as Record<string, unknown>;
    const GoogleGenAI = (m?.GoogleGenAI ?? m?.GoogleAI ?? m?.default) as unknown;
    if (!GoogleGenAI) {
      throw new Error("@google/genai is installed but exports are unexpected");
    }
    const { PROMPTS, isPreviewImageModel } = await import("@/lib/config");

    const isBrowser = typeof window !== 'undefined';
    const prefersV1beta = isPreviewImageModel(params.model);

    // Helper to try with different API versions since some preview models are only available in specific versions
    const tryWithApiVersion = async (apiVersion: 'v1' | 'v1beta') => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - SDK type not available here
      const client = new (GoogleGenAI as new (...args: unknown[]) => unknown)({ apiKey: params.apiKey, apiVersion });

      // If on server and caller prefers Images API, try it first
      if (!isBrowser && params.preferImagesApi && (client as Record<string, unknown>).models && ((client as Record<string, unknown>).models as Record<string, unknown>).generateImages) {
        const modelsObj = (client as Record<string, unknown>).models as Record<string, unknown>;
        const genImagesFn = modelsObj.generateImages as ((arg: unknown) => Promise<unknown>) | undefined;
        try {
          const res = await withRetries(() => genImagesFn ? genImagesFn({ model: params.model, prompt: params.prompt, size: params.size }) : Promise.reject(new Error('generateImages not available')), {
            preferPlaceholderOn429: params.preferPlaceholderOn429,
            prompt: params.prompt,
            size: params.size,
          });
          const rr = res as Record<string, unknown> | undefined;
          const dataArr = Array.isArray(rr?.data) ? (rr!.data as unknown[]) : [];
          const imagesArr = Array.isArray(rr?.images) ? (rr!.images as unknown[]) : [];
          const d0 = dataArr[0] as Record<string, unknown> | undefined;
          const i0 = imagesArr[0] as Record<string, unknown> | undefined;
          const candidate =
            (d0?.b64Data as string | undefined) ||
            ((d0?.image as Record<string, unknown> | undefined)?.base64Data as string | undefined) ||
            (i0?.b64Data as string | undefined) ||
            ((i0?.image as Record<string, unknown> | undefined)?.base64Data as string | undefined);
          if (candidate && typeof candidate === 'string') {
            return { dataUrl: `data:image/png;base64,${candidate}` };
          }
        } catch {
          // fall through to generateContent path
        }
      }

      // Primary path for Gemini preview models: models.generateContent
      if ((client as Record<string, unknown>)?.models && (client as Record<string, unknown>).models && (client as Record<string, Record<string, unknown>>).models!.generateContent) {
        const { createUserContent, createPartFromUri } = (m || {}) as Record<string, unknown>;

        type InlineData = { inlineData: { mimeType?: string; data: string } } | { inline_data: { mimeType?: string; data: string } };
        type TextPart = { text: string };
        type Part = InlineData | TextPart | unknown;

        async function buildContents(): Promise<unknown[]> {
          const parts: Part[] = [];
          parts.push(PROMPTS.imageOnlyDirective);
          if (params.prompt) {
            parts.push(params.prompt);
          }
          if (params.referenceImageDataUrl) {
            const { mimeType, base64 } = parseDataUrl(params.referenceImageDataUrl);
            try {
              // Prefer files.upload + createPartFromUri per docs
              const file = await dataUrlToFile(params.referenceImageDataUrl, `ref.${(mimeType||'image/png').split('/')[1] || 'png'}`);
              const filesObj = (client as Record<string, unknown>).files as Record<string, unknown> | undefined;
              const uploadFn = filesObj?.upload as ((arg: unknown) => Promise<unknown>) | undefined;
              const uploaded = uploadFn ? await uploadFn({ file }) : undefined;
              const up = uploaded as Record<string, unknown> | undefined;
              const p = typeof createPartFromUri === 'function' && up?.uri
                ? (createPartFromUri as (uri: unknown, mimeType: unknown) => unknown)(up.uri, up.mimeType)
                : { inlineData: { mimeType, data: base64 } };
              parts.push(p);
            } catch {
              // Fallback to inlineData part
              parts.push({ inlineData: { mimeType: mimeType || "image/png", data: base64 } });
            }
          }
          if (typeof createUserContent === 'function') {
            return [(createUserContent as (parts: unknown[]) => unknown)(parts)];
          }
          // Fallback shape if helpers missing
          return parts.map((p) => (typeof p === 'string' ? { text: p } : p));
        }

        const tryGenerateContent = async (model: string) => {
          const contents = await buildContents();
          const req: Record<string, unknown> = { model, contents };
          // Do NOT set generationConfig here; some versions reject responseModalities/responseMimeType
          const modelsObj = (client as Record<string, unknown>).models as Record<string, unknown> | undefined;
          const genContentFn = modelsObj?.generateContent as ((arg: unknown) => Promise<unknown>) | undefined;
          const res = genContentFn ? await genContentFn(req) : undefined;
          const r = res as Record<string, unknown> | undefined;
          const candidates = (r?.candidates as unknown[]) || ((r?.data as Record<string, unknown> | undefined)?.candidates as unknown[]) || [];
          for (const candItem of candidates) {
            const cand = candItem as Record<string, unknown>;
            const parts = ((cand?.content as Record<string, unknown> | undefined)?.parts as unknown[]) || [];
            for (const pItem of parts) {
              const p = pItem as Record<string, unknown>;
              const inline = (p.inlineData as { mimeType?: string; data?: string } | undefined) || (p.inline_data as { mimeType?: string; data?: string } | undefined);
              if (inline?.data) {
                const mt = inline.mimeType || "image/png";
                return { dataUrl: `data:${mt};base64,${inline.data}` };
              }
            }
          }
          throw new Error("No inline image data returned by generateContent");
        };

        try {
          return await withRetries(() => tryGenerateContent(params.model), {
            preferPlaceholderOn429: params.preferPlaceholderOn429,
            prompt: params.prompt,
            size: params.size,
          });
        } catch (err: unknown) {
          const msg = String((err as { message?: string })?.message || err);
          const is404 = msg.includes("404") || msg.includes("NOT_FOUND") || msg.toLowerCase().includes("not found");
          if (is404) {
            const fallbacks = dedupe([
              params.model,
              // flip between the two preview model ids
              params.model.startsWith("gemini-2.5")
                ? "gemini-2.0-flash-preview-image-generation"
                : "gemini-2.5-flash-image-preview",
            ]);
            for (const m of fallbacks) {
              if (m === params.model) continue;
              try {
                return await withRetries(() => tryGenerateContent(m), {
                  preferPlaceholderOn429: params.preferPlaceholderOn429,
                  prompt: params.prompt,
                  size: params.size,
                });
              } catch {
                // try next
              }
            }
          }
          // If generateContent failed for other reasons, try generateImages as a secondary path (server-only; predict CORS blocks in browser)
          if (!isBrowser && (client as Record<string, unknown>).models && ((client as Record<string, unknown>).models as Record<string, unknown>).generateImages) {
            try {
              const modelsObj = (client as Record<string, unknown>).models as Record<string, unknown>;
              const genImagesFn = modelsObj.generateImages as ((arg: unknown) => Promise<unknown>) | undefined;
              const res = await withRetries(() => genImagesFn ? genImagesFn({ model: params.model, prompt: params.prompt }) : Promise.reject(new Error('generateImages not available')), {
                preferPlaceholderOn429: params.preferPlaceholderOn429,
                prompt: params.prompt,
                size: params.size,
              });
              const rr = res as Record<string, unknown> | undefined;
              const dataArr = Array.isArray(rr?.data) ? (rr!.data as unknown[]) : [];
              const imagesArr = Array.isArray(rr?.images) ? (rr!.images as unknown[]) : [];
              const d0 = dataArr[0] as Record<string, unknown> | undefined;
              const i0 = imagesArr[0] as Record<string, unknown> | undefined;
              const candidate =
                (d0?.b64Data as string | undefined) ||
                ((d0?.image as Record<string, unknown> | undefined)?.base64Data as string | undefined) ||
                (i0?.b64Data as string | undefined) ||
                ((i0?.image as Record<string, unknown> | undefined)?.base64Data as string | undefined);
              if (!candidate || typeof candidate !== "string") {
                throw new Error("Image generation returned no image data");
              }
              return { dataUrl: `data:image/png;base64,${candidate}` };
            } catch {
              // continue to throw original error
            }
          }
          throw err;
        }
      }

      // Secondary: models.generateImages if present and generateContent not available (server-only)
      if (!isBrowser && (client as Record<string, unknown>).models && ((client as Record<string, unknown>).models as Record<string, unknown>).generateImages) {
        const modelsObj = (client as Record<string, unknown>).models as Record<string, unknown>;
        const genImagesFn = modelsObj.generateImages as ((arg: unknown) => Promise<unknown>) | undefined;
        const res = await withRetries(() => genImagesFn ? genImagesFn({ model: params.model, prompt: params.prompt }) : Promise.reject(new Error('generateImages not available')), {
          preferPlaceholderOn429: params.preferPlaceholderOn429,
          prompt: params.prompt,
          size: params.size,
        });
        const rr = res as Record<string, unknown> | undefined;
        const dataArr = Array.isArray(rr?.data) ? (rr!.data as unknown[]) : [];
        const imagesArr = Array.isArray(rr?.images) ? (rr!.images as unknown[]) : [];
        const d0 = dataArr[0] as Record<string, unknown> | undefined;
        const i0 = imagesArr[0] as Record<string, unknown> | undefined;
        const candidate =
          (d0?.b64Data as string | undefined) ||
          ((d0?.image as Record<string, unknown> | undefined)?.base64Data as string | undefined) ||
          (i0?.b64Data as string | undefined) ||
          ((i0?.image as Record<string, unknown> | undefined)?.base64Data as string | undefined);
        if (!candidate || typeof candidate !== "string") {
          throw new Error("Image generation returned no image data");
        }
        return { dataUrl: `data:image/png;base64,${candidate}` };
      }

      // Legacy fallback (server-only)
      if (!isBrowser && (client as Record<string, unknown>).images && ((client as Record<string, unknown>).images as Record<string, unknown>).generate) {
        const imagesObj = (client as Record<string, unknown>).images as Record<string, unknown>;
        const generateFn = imagesObj.generate as ((arg: unknown) => Promise<unknown>) | undefined;
        const res = await withRetries(() => generateFn ? generateFn({
          model: params.model,
          prompt: params.prompt,
          image: params.referenceImageDataUrl,
          inputImage: params.referenceImageDataUrl,
          size: params.size,
        }) : Promise.reject(new Error('images.generate not available')), {
          preferPlaceholderOn429: params.preferPlaceholderOn429,
          prompt: params.prompt,
          size: params.size,
        });
        const rr = res as Record<string, unknown> | undefined;
        const dataArr = Array.isArray(rr?.data) ? (rr!.data as unknown[]) : [];
        const imagesArr = Array.isArray(rr?.images) ? (rr!.images as unknown[]) : [];
        const d0 = dataArr[0] as Record<string, unknown> | undefined;
        const i0 = imagesArr[0] as Record<string, unknown> | undefined;
        const candidate =
          (d0?.b64Data as string | undefined) ||
          ((d0?.image as Record<string, unknown> | undefined)?.base64Data as string | undefined) ||
          (i0?.b64Data as string | undefined) ||
          ((i0?.image as Record<string, unknown> | undefined)?.base64Data as string | undefined);
        if (!candidate || typeof candidate !== "string") {
          throw new Error("Image generation returned no image data");
        }
        return { dataUrl: `data:image/png;base64,${candidate}` };
      }

      throw new Error("@google/genai client has no image generation method available");
    };

    // Try API versions in best-guess order, then REST fallback
    const order: Array<'v1' | 'v1beta'> = prefersV1beta ? (isBrowser ? ['v1beta'] : ['v1beta', 'v1']) : ['v1', 'v1beta'];
    let lastErr: unknown;
    for (const ver of order) {
      try {
        return await tryWithApiVersion(ver);
      } catch (e: unknown) {
        lastErr = e;
        // continue
      }
    }
    // Last resort REST call (browser-safe) using contents inlineData
    try {
      const versions: Array<'v1' | 'v1beta'> = prefersV1beta ? ['v1beta', 'v1'] : ['v1', 'v1beta'];
      return await restGenerateContentImage(params.apiKey, params.model, params.prompt, params.referenceImageDataUrl, versions);
    } catch (e) {
      throw lastErr || e;
    }

    // Should not reach here, but keep dev fallback in case SDK missing
  }

  // Dev fallback: SDK not present
  const dataUrl = await renderPlaceholderPng(params.prompt, params.size);
  return { dataUrl };
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function parseDataUrl(dataUrl: string): { mimeType?: string; base64: string } {
  const m = /^data:([^;]+);base64,(.*)$/i.exec(dataUrl);
  if (m) return { mimeType: m[1], base64: m[2] };
  // Fallback if not a data URL; assume already base64 image/png
  return { mimeType: "image/png", base64: dataUrl };
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  if (typeof File !== 'undefined') {
    return new File([blob], filename, { type: blob.type });
  }
  throw new Error('File constructor not available');
}

async function withRetries<T>(
  fn: () => Promise<T>,
  opts?: { preferPlaceholderOn429?: boolean; prompt?: string; size?: string },
  maxAttempts = 3
): Promise<T> {
  let attempt = 0;
  let lastErr: unknown;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const info = extractRetryInfo(err);
      if (!info.shouldRetry) break;
      if (opts?.preferPlaceholderOn429 && info.delayMs >= 10000) {
        // Prefer immediate placeholder instead of waiting a long time
        const dataUrl = await renderPlaceholderPng(opts?.prompt || "", opts?.size);
        return { dataUrl } as unknown as T;
      }
      await sleep(info.delayMs);
      attempt++;
    }
  }
  throw lastErr;
}

function extractRetryInfo(err: unknown): { shouldRetry: boolean; delayMs: number } {
  const e = err as Record<string, unknown> | undefined;
  const msg = String((e?.message as string) || "").toLowerCase();
  const is429 = msg.includes("429") || msg.includes("resource_exhausted") || (e?.status === 429) || (e?.code === 429);
  if (!is429) return { shouldRetry: false, delayMs: 0 };
  // Try parse retry delay hints
  let delayMs = 3000;
  const details = ((e?.error as Record<string, unknown> | undefined)?.details || (e?.details as unknown[])) as unknown[] | undefined;
  const retryInfo = (details || []).find((d: unknown) => {
    const t = (d as Record<string, unknown>)?.['@type'];
    return String(t || '').toLowerCase().includes('retryinfo');
  }) as Record<string, unknown> | undefined;
  const raw = (retryInfo?.retryDelay || retryInfo?.retry_delay || retryInfo?.retry_after) as string | undefined;
  if (typeof raw === 'string' && raw.endsWith('s')) {
    const n = parseFloat(raw.slice(0, -1));
    if (isFinite(n) && n > 0) delayMs = Math.round(n * 1000);
  }
  return { shouldRetry: true, delayMs };
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

// Optional: direct REST fallback using fetch, matching https://generativelanguage.googleapis.com/{version}/models/*:generateContent
async function restGenerateContentImage(
  apiKey: string,
  model: string,
  prompt: string,
  referenceImageDataUrl?: string,
  versions: Array<'v1' | 'v1beta'> = ['v1', 'v1beta']
): Promise<{ dataUrl: string }> {
  const modelPath = model.startsWith('models/') ? model : `models/${model}`;
  const contents: unknown[] = [];
  const parts: Array<{ text?: string } | { inlineData?: { mimeType?: string; data: string } }> = [];
  const { PROMPTS } = await import("@/lib/config");
  parts.push({ text: PROMPTS.imageOnlyDirective });
  if (prompt) parts.push({ text: prompt });
  if (referenceImageDataUrl) {
    const { mimeType, base64 } = parseDataUrl(referenceImageDataUrl);
    parts.push({ inlineData: { mimeType: mimeType || 'image/png', data: base64 } });
  }
  contents.push({ role: 'user', parts } as unknown);
  const body: Record<string, unknown> = { contents };

  for (const v of versions) {
    const url = `https://generativelanguage.googleapis.com/${v}/${modelPath}:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let errorObj: unknown;
      try { errorObj = JSON.parse(text); } catch { errorObj = { error: { message: text } }; }
      const err = errorObj as { error?: { message?: string } };
      throw Object.assign(new Error(err?.error?.message || `HTTP ${res.status}`), { status: res.status, error: err?.error || errorObj });
    }
    const json: unknown = await res.json();
    const candidates = (json as Record<string, unknown> | undefined)?.candidates as unknown[] || [];
    for (const cand of candidates as Array<Record<string, unknown>>) {
      const partsList = ((cand?.content as Record<string, unknown> | undefined)?.parts as unknown[]) || [];
      let inlineFound: { mimeType?: string; data?: string } | undefined;
      for (const pp of partsList) {
        const pr = pp as Record<string, unknown>;
        const inline = (pr.inlineData as { mimeType?: string; data?: string } | undefined) || (pr.inline_data as { mimeType?: string; data?: string } | undefined);
        if (inline?.data) { inlineFound = inline; break; }
      }
      if (inlineFound?.data) {
        const mt = inlineFound.mimeType || 'image/png';
        return { dataUrl: `data:${mt};base64,${inlineFound.data}` };
      }
    }
  }
  throw new Error('No inline image data returned by REST generateContent');
}

async function renderPlaceholderPng(text: string, size: string | undefined): Promise<string> {
  const [w, h] = (size || "768x512").split("x").map((n) => parseInt(n, 10));
  const canvas = document.createElement("canvas");
  canvas.width = isFinite(w) ? w : 768;
  canvas.height = isFinite(h) ? h : 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.fillStyle = "#111827"; // slate-900
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e5e7eb"; // gray-200
  ctx.font = "bold 28px system-ui, -apple-system, Segoe UI, Roboto";
  wrapText(ctx, text || "(no prompt)", 32, 64, canvas.width - 64, 34);
  ctx.fillStyle = "#9ca3af"; // gray-400
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText("Placeholder (SDK unavailable)", 32, canvas.height - 32);
  return canvas.toDataURL("image/png");
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/);
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}
