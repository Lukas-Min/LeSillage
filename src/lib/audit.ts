"use server";

import { db } from "@/db/client";
import { auditLog, type AuditAction } from "@/db/schema";

export interface AuditEntry {
  actor: string;
  action: AuditAction;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function auditLogSubject(entry: AuditEntry): Promise<void> {
  await db().insert(auditLog).values({
    actor: entry.actor,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId ?? null,
    metadata: (entry.metadata as Record<string, unknown> | null) ?? null,
  });
}
