"use client";

import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { ZDocument } from '@/lib/schemas'
import {
    deleteDocument as idbDeleteDocument, DocumentMeta, getDocument as idbGetDocument,
    listDocuments as idbListDocuments, putDocument as idbPutDocument
} from '@/lib/storage'

import type { DocumentT } from "@/lib/schemas";
type DocumentsState = {
  docs: DocumentMeta[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
  create: (title?: string) => Promise<DocumentT>;
  remove: (id: string) => Promise<void>;
  get: (id: string) => Promise<DocumentT | undefined>;
  save: (doc: DocumentT) => Promise<void>;
};

export const useDocumentsStore = create<DocumentsState>((set) => ({
  docs: [],
  loading: false,
  refresh: async () => {
    set({ loading: true, error: undefined });
    try {
      const docs = await idbListDocuments();
      set({ docs, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },
  create: async (title = "Untitled") => {
    const now = Date.now();
    const doc: DocumentT = {
      id: nanoid(12),
      title,
      createdAt: now,
      updatedAt: now,
      nodes: [],
      edges: [],
    };
    const parsed = ZDocument.parse(doc);
    await idbPutDocument(parsed);
    // Optimistically update list
    set((s) => ({ docs: [{ id: parsed.id, title: parsed.title, createdAt: parsed.createdAt, updatedAt: parsed.updatedAt }, ...s.docs] }));
    return parsed;
  },
  remove: async (id: string) => {
    await idbDeleteDocument(id);
    set((s) => ({ docs: s.docs.filter((d) => d.id !== id) }));
  },
  get: async (id: string) => {
    return await idbGetDocument(id);
  },
  save: async (doc: DocumentT) => {
    const updated: DocumentT = { ...doc, updatedAt: Date.now() };
    await idbPutDocument(updated);
    set((s) => ({
      docs: s.docs.map((d) => (d.id === updated.id ? { id: updated.id, title: updated.title, createdAt: updated.createdAt, updatedAt: updated.updatedAt } : d)),
    }));
  },
}));

