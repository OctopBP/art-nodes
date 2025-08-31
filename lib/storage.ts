import { createStore, del, entries, get, keys, set } from "idb-keyval";
import { ZDocument, type DocumentT } from "@/lib/schemas";
import type { StateStorage } from "zustand/middleware";

const dbName = "artnodes" as const;

export const stores = {
  documents: createStore(dbName, "documents"),
  settings: createStore(dbName, "settings"),
  thumbnails: createStore(dbName, "thumbnails"),
} as const;

// Documents API
export async function putDocument(doc: DocumentT): Promise<void> {
  const parsed = ZDocument.parse(doc);
  await set(parsed.id, parsed, stores.documents);
}

export async function getDocument(id: string): Promise<DocumentT | undefined> {
  const val = (await get(id, stores.documents)) as unknown;
  if (!val) return undefined;
  return ZDocument.parse(val);
}

export async function deleteDocument(id: string): Promise<void> {
  await del(id, stores.documents);
}

export type DocumentMeta = Pick<DocumentT, "id" | "title" | "updatedAt" | "createdAt">;

export async function listDocuments(): Promise<DocumentMeta[]> {
  const all = (await entries(stores.documents)) as [string, DocumentT][];
  return all
    .map(([, doc]) => ({ id: doc.id, title: doc.title, createdAt: doc.createdAt, updatedAt: doc.updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDocuments(): Promise<DocumentT[]> {
  const all = (await entries(stores.documents)) as [string, DocumentT][];
  return all.map(([, doc]) => ZDocument.parse(doc)).sort((a, b) => b.updatedAt - a.updatedAt);
}

// Settings API (key-value)
export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
  return (await get(key, stores.settings)) as T | undefined;
}

export async function setSetting<T = unknown>(key: string, value: T): Promise<void> {
  await set(key, value as unknown as any, stores.settings);
}

export async function deleteSetting(key: string): Promise<void> {
  await del(key, stores.settings);
}

// Zustand persist adapter backed by IndexedDB
export function createIdbStateStorage(storeName: keyof typeof stores, keyOverride?: string): StateStorage {
  const store = stores[storeName];
  return {
    getItem: async (name) => {
      const v = await get(keyOverride ?? name, store);
      return (v as string | null) ?? null;
    },
    setItem: async (name, value) => {
      await set(keyOverride ?? name, value, store);
    },
    removeItem: async (name) => {
      await del(keyOverride ?? name, store);
    },
  };
}

