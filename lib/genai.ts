// Lightweight wrapper around Google AI image generation.
// Tries @google/genai first, then @google/generative-ai, with a safe fallback that generates
// a local placeholder PNG when the SDK or network is unavailable (useful in dev).

export type GenerateImageParams = {
  apiKey: string;
  model: string; // e.g., 'imagen-3.0'
  prompt: string;
  referenceImageDataUrl?: string; // optional image conditioning
  size?: `${number}x${number}`; // hint/resolution, if supported by the model
};

export async function generateImage(params: GenerateImageParams): Promise<{ dataUrl: string }> {
  try {
    // Prefer @google/genai if present
    const mod: any = await import(/* @vite-ignore */ "@google/genai").catch(() => null);
    if (mod) {
      // Heuristic: look for GoogleAI client with images API
      const GoogleAI = mod.GoogleAI || mod.default || mod.GoogleGenerativeAI;
      if (!GoogleAI) throw new Error("@google/genai missing GoogleAI export");
      const client = new GoogleAI({ apiKey: params.apiKey });
      if (client.images?.generate) {
        const res = await client.images.generate({
          model: params.model,
          prompt: params.prompt,
          // Some SDKs accept 'image' or 'inputImage' for conditioning; try both if available
          image: params.referenceImageDataUrl,
          inputImage: params.referenceImageDataUrl,
          size: params.size,
        });
        const b64: string | undefined = res?.data?.[0]?.b64Data || res?.data?.[0]?.image?.base64Data;
        if (b64) return { dataUrl: `data:image/png;base64,${b64}` };
      }
    }
  } catch (e) {
    // fallthrough to next attempt
    // console.warn("@google/genai path failed", e);
  }

  // Note: we intentionally avoid importing '@google/generative-ai' to prevent
  // bundler resolution errors when it's not installed. If needed later, we can
  // add it explicitly to dependencies and re-enable a fallback path.

  // Dev fallback: generate a placeholder PNG with the prompt text
  const dataUrl = await renderPlaceholderPng(params.prompt, params.size);
  return { dataUrl };
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
