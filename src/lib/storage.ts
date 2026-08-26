import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

let cached: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (cached) return cached;
  const env = getEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin client unavailable: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

export async function signReceiptUploadUrl(path: string): Promise<string> {
  const client = getSupabaseAdmin();
  const { data, error } = await client.storage.from("receipts").createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Failed to sign upload URL");
  return data.signedUrl;
}
