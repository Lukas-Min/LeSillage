import type { FragellaRecord } from "@/lib/fragella";
import type { ParsedFragranticaPage } from "@/lib/fragrantica";

export interface ReviewPayload {
  fragella: FragellaRecord | null;
  parsed: ParsedFragranticaPage | null;
  query: string;
  fragranticaUrl: string | null;
}

interface StoredEntry {
  payload: ReviewPayload;
  storedAt: number;
}

const TTL_MS = 15 * 60 * 1000;
const pendingStore = new Map<string, StoredEntry>();

const pendingKey = (adminId: string, query: string) =>
  `fragella:${adminId}:${query.trim().toLowerCase()}`;

export function persistPendingPayload(adminId: string, payload: ReviewPayload) {
  pendingStore.set(pendingKey(adminId, payload.query), { payload, storedAt: Date.now() });
}

export async function lookupPendingPayload(
  adminId: string,
  query: string,
): Promise<ReviewPayload | null> {
  const entry = pendingStore.get(pendingKey(adminId, query));
  if (!entry) return null;
  if (Date.now() - entry.storedAt > TTL_MS) {
    pendingStore.delete(pendingKey(adminId, query));
    return null;
  }
  return entry.payload;
}

export function clearPendingPayload(adminId: string, query: string) {
  pendingStore.delete(pendingKey(adminId, query));
}