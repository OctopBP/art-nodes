import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/genai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      apiKey?: string;
      model: string;
      prompt: string;
      referenceImageDataUrl?: string;
      size?: string;
      preferPlaceholderOn429?: boolean;
    };
    const apiKey = body.apiKey || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 400 });
    }
    const { dataUrl } = await generateImage({
      apiKey,
      model: body.model,
      prompt: body.prompt,
      referenceImageDataUrl: body.referenceImageDataUrl,
      size: body.size as `${number}x${number}` | undefined,
      preferPlaceholderOn429: body.preferPlaceholderOn429,
      // Prefer Images API on the server to better honor size/aspect
      preferImagesApi: true,
    });
    return NextResponse.json({ dataUrl });
  } catch (e) {
    const msg = (e as Error).message || "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

