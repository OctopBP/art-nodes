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
};

export async function generateImage(params: GenerateImageParams): Promise<{ dataUrl: string }> {
  // Try the official SDK first; only fall back to placeholder when SDK is missing.
  const mod: any = await import("@google/genai").catch(() => null);
  if (mod) {
    // Prefer GoogleGenAI per current SDK versions
    const GoogleGenAI = mod.GoogleGenAI || mod.GoogleAI || mod.default;
    if (!GoogleGenAI) {
      throw new Error("@google/genai is installed but exports are unexpected");
    }
    const Modality: any = (mod as any).Modality;
    const { PROMPTS, isPreviewImageModel } = await import("@/lib/config");

    const isBrowser = typeof window !== 'undefined';
    const prefersV1beta = isPreviewImageModel(params.model);

    // Helper to try with different API versions since some preview models are only available in specific versions
    const tryWithApiVersion = async (apiVersion: 'v1' | 'v1beta') => {
      const client = new GoogleGenAI({ apiKey: params.apiKey, apiVersion });

      // Primary path for Gemini preview models: models.generateContent
      if (client.models?.generateContent) {
        const { createUserContent, createPartFromUri } = mod as any;

        async function buildContents(): Promise<any[]> {
          const parts: any[] = [];
          parts.push(PROMPTS.imageOnlyDirective);
          if (params.prompt) {
            parts.push(params.prompt);
          }
          if (params.referenceImageDataUrl) {
            const { mimeType, base64 } = parseDataUrl(params.referenceImageDataUrl);
            try {
              // Prefer files.upload + createPartFromUri per docs
              const file = await dataUrlToFile(params.referenceImageDataUrl, `ref.${(mimeType||'image/png').split('/')[1] || 'png'}`);
              const uploaded = await client.files.upload({ file });
              const p = createPartFromUri ? createPartFromUri(uploaded.uri, uploaded.mimeType) : { inlineData: { mimeType, data: base64 } };
              parts.push(p);
            } catch {
              // Fallback to inlineData part
              parts.push({ inlineData: { mimeType: mimeType || "image/png", data: base64 } });
            }
          }
          if (createUserContent) {
            return [createUserContent(parts)];
          }
          // Fallback shape if helpers missing
          return parts.map((p) => (typeof p === 'string' ? { text: p } : p));
        }

        const tryGenerateContent = async (model: string) => {
          const contents = await buildContents();
          const req: any = { model, contents };
          // Do NOT set generationConfig here; some versions reject responseModalities/responseMimeType
          const res = await client.models.generateContent(req);
          const candidates = (res as any)?.candidates || (res as any)?.data?.candidates || [];
          for (const cand of candidates) {
            const parts = cand?.content?.parts || [];
            for (const p of parts) {
              const inline = p?.inlineData || p?.inline_data;
              if (inline?.data) {
                const mt = inline?.mimeType || "image/png";
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
        } catch (err: any) {
          const msg = String(err?.message || err);
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
              } catch (_) {
                // try next
              }
            }
          }
          // If generateContent failed for other reasons, try generateImages as a secondary path (server-only; predict CORS blocks in browser)
          if (!isBrowser && client.models?.generateImages) {
            try {
              const res = await withRetries(() => client.models.generateImages({ model: params.model, prompt: params.prompt }), {
                preferPlaceholderOn429: params.preferPlaceholderOn429,
                prompt: params.prompt,
                size: params.size,
              });
              const candidate =
                res?.data?.[0]?.b64Data ||
                res?.data?.[0]?.image?.base64Data ||
                res?.images?.[0]?.b64Data ||
                res?.images?.[0]?.image?.base64Data;
              if (!candidate || typeof candidate !== "string") {
                throw new Error("Image generation returned no image data");
              }
              return { dataUrl: `data:image/png;base64,${candidate}` };
            } catch (_) {
              // continue to throw original error
            }
          }
          throw err;
        }
      }

      // Secondary: models.generateImages if present and generateContent not available (server-only)
      if (!isBrowser && client.models?.generateImages) {
        const res = await withRetries(() => client.models.generateImages({ model: params.model, prompt: params.prompt }), {
          preferPlaceholderOn429: params.preferPlaceholderOn429,
          prompt: params.prompt,
          size: params.size,
        });
        const candidate =
          res?.data?.[0]?.b64Data ||
          res?.data?.[0]?.image?.base64Data ||
          res?.images?.[0]?.b64Data ||
          res?.images?.[0]?.image?.base64Data;
        if (!candidate || typeof candidate !== "string") {
          throw new Error("Image generation returned no image data");
        }
        return { dataUrl: `data:image/png;base64,${candidate}` };
      }

      // Legacy fallback (server-only)
      if (!isBrowser && client.images?.generate) {
        const res = await withRetries(() => client.images.generate({
          model: params.model,
          prompt: params.prompt,
          image: params.referenceImageDataUrl,
          inputImage: params.referenceImageDataUrl,
          size: params.size,
        }), {
          preferPlaceholderOn429: params.preferPlaceholderOn429,
          prompt: params.prompt,
          size: params.size,
        });
        const candidate =
          res?.data?.[0]?.b64Data ||
          res?.data?.[0]?.image?.base64Data ||
          res?.images?.[0]?.b64Data ||
          res?.images?.[0]?.image?.base64Data;
        if (!candidate || typeof candidate !== "string") {
          throw new Error("Image generation returned no image data");
        }
        return { dataUrl: `data:image/png;base64,${candidate}` };
      }

      throw new Error("@google/genai client has no image generation method available");
    };

    // Try API versions in best-guess order, then REST fallback
    const order: Array<'v1' | 'v1beta'> = prefersV1beta ? (isBrowser ? ['v1beta'] : ['v1beta', 'v1']) : ['v1', 'v1beta'];
    let lastErr: any;
    for (const ver of order) {
      try {
        return await tryWithApiVersion(ver);
      } catch (e: any) {
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

async function withRetries<T>(
  fn: () => Promise<T>,
  opts?: { preferPlaceholderOn429?: boolean; prompt?: string; size?: string },
  maxAttempts = 3
): Promise<T> {
  let attempt = 0;
  let lastErr: any;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const info = extractRetryInfo(err);
      if (!info.shouldRetry) break;
      if (opts?.preferPlaceholderOn429 && info.delayMs >= 10000) {
        // Prefer immediate placeholder instead of waiting a long time
        const dataUrl = await renderPlaceholderPng(opts?.prompt || "", opts?.size);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { dataUrl } as any;
      }
      await sleep(info.delayMs);
      attempt++;
    }
  }
  throw lastErr;
}

function extractRetryInfo(err: any): { shouldRetry: boolean; delayMs: number } {
  const msg = String(err?.message || "").toLowerCase();
  const is429 = msg.includes("429") || msg.includes("resource_exhausted") || err?.status === 429 || err?.code === 429;
  if (!is429) return { shouldRetry: false, delayMs: 0 };
  // Try parse retry delay hints
  let delayMs = 3000;
  const retryInfo = (err?.error?.details || err?.details || []).find((d: any) => (d?.['@type'] || '').toString().toLowerCase().includes('retryinfo'));
  const raw = retryInfo?.retryDelay || retryInfo?.retry_delay || retryInfo?.retry_after;
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
  const contents: any[] = [];
  const parts: any[] = [];
  const { PROMPTS } = await import("@/lib/config");
  parts.push({ text: PROMPTS.imageOnlyDirective });
  if (prompt) parts.push({ text: prompt });
  if (referenceImageDataUrl) {
    const { mimeType, base64 } = parseDataUrl(referenceImageDataUrl);
    parts.push({ inlineData: { mimeType: mimeType || 'image/png', data: base64 } });
  }
  contents.push({ role: 'user', parts });
  const body: any = { contents };

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
      let errorObj: any;
      try { errorObj = JSON.parse(text); } catch { errorObj = { error: { message: text } }; }
      throw Object.assign(new Error(errorObj?.error?.message || `HTTP ${res.status}`), { status: res.status, error: errorObj?.error || errorObj });
    }
    const json: any = await res.json();
    const candidates = json?.candidates || [];
    for (const cand of candidates) {
      const p = (cand?.content?.parts || []).find((pp: any) => pp?.inlineData?.data || pp?.inline_data?.data);
      if (p) {
        const inline = p.inlineData || p.inline_data;
        const mt = inline?.mimeType || 'image/png';
        return { dataUrl: `data:${mt};base64,${inline.data}` };
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
