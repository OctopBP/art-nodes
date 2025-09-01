export type ModelOption = { value: string; label: string };

export const MODEL_OPTIONS: ModelOption[] = [
  { value: "gemini-2.5-flash-image-preview", label: "Gemini 2.5 Flash (image preview)" },
  { value: "gemini-2.0-flash-preview-image-generation", label: "Gemini 2.0 Flash (preview image generation)" },
];

export const DEFAULT_MODEL = MODEL_OPTIONS[0].value;

export const PROMPTS = {
  imageOnlyDirective: "Generate an image only. Do not ask clarifying questions. Do not reply with text.",
};

export function isPreviewImageModel(model: string): boolean {
  const m = model.toLowerCase();
  return m.includes("preview") || m.includes("image");
}

export const RATE_LIMIT = {
  immediatePlaceholderDelayMs: 10_000, // if retry-after >= 10s and user prefers placeholder
  maxAttempts: 3,
  defaultBackoffMs: 3000,
};

