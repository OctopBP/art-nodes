"use client";

import { useState } from "react";
import { useSettingsStore } from "@/store/settings";
import { MODEL_OPTIONS } from "@/lib/config";

export default function SettingsPage() {
  const apiKey = useSettingsStore((s) => s.apiKey);
  const model = useSettingsStore((s) => s.model);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const setModel = useSettingsStore((s) => s.setModel);
  const placeholderOnRateLimit = useSettingsStore((s) => s.placeholderOnRateLimit);
  const setPlaceholderOnRateLimit = useSettingsStore((s) => s.setPlaceholderOnRateLimit);
  const [showKey, setShowKey] = useState(false);
  // options provided by config

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-sm text-gray-500 mt-2">Configure API keys and preferences.</p>

      <section className="mt-8 max-w-xl space-y-6">
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium mb-1">
            GOOGLE_AI_API_KEY
          </label>
          <div className="flex items-stretch gap-2">
            <input
              id="apiKey"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              placeholder="Paste your Google AI API key"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="rounded-md border border-black/10 dark:border-white/10 px-3 text-sm"
              aria-label={showKey ? "Hide API key" : "Show API key"}
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Stored locally in your browser (IndexedDB). Do not use production keys in client-side apps.</p>
        </div>

        <div>
          <label htmlFor="model" className="block text-sm font-medium mb-1">
            Default Model
          </label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white dark:bg-black">
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Select a model for image generation.</p>
        </div>

        <div className="text-xs text-gray-500">Changes save automatically.</div>
        <div className="pt-4 border-t border-black/10 dark:border-white/10">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={placeholderOnRateLimit}
              onChange={(e) => setPlaceholderOnRateLimit(e.target.checked)}
            />
            Fallback to placeholder on rate limit (429)
          </label>
          <p className="text-xs text-gray-500 mt-1">If enabled, uses a local placeholder image when rate-limited instead of waiting to retry.</p>
        </div>
      </section>
    </main>
  );
}
