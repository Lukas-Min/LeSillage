"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { db } from "@/db/client";
import { qrCodes } from "@/db/schema";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { auditLogSubject } from "@/lib/audit";
import { uploadPublicImage } from "@/lib/blob";

async function limitAdmin(adminId: string, key: string) {
  const decision = await rateLimit({
    bucket: "ACCOUNT",
    key: await getRequestKey(key, adminId),
    limit: 40,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");
}

export async function createQrCode(formData: FormData) {
  const admin = await requireAdmin();
  await limitAdmin(admin.id, "qr-create");
  const bankName = z.string().min(1).parse(formData.get("bankName"));
  const accountName = z.string().min(1).parse(formData.get("accountName"));
  const accountNumber = z.string().min(1).parse(formData.get("accountNumber"));
  const position = z.coerce.number().int().min(0).parse(formData.get("position") || 0);
  const isActive = formData.get("isActive") === "on";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("QR image required");
  const uploaded = await uploadPublicImage("qr", {
    name: file.name,
    type: file.type,
    bytes: await file.arrayBuffer(),
  });
  const [row] = await db()
    .insert(qrCodes)
    .values({ bankName, accountName, accountNumber, position, isActive, imageUrl: uploaded.url })
    .returning({ id: qrCodes.id });
  await auditLogSubject({ actor: admin.id, action: "QR_CREATE", targetType: "qr_code", targetId: row.id });
  revalidatePath("/admin/qr");
}

export async function updateQrCode(formData: FormData) {
  const admin = await requireAdmin();
  await limitAdmin(admin.id, "qr-update");
  const id = z.string().min(1).parse(formData.get("id"));
  const bankName = z.string().min(1).parse(formData.get("bankName"));
  const accountName = z.string().min(1).parse(formData.get("accountName"));
  const accountNumber = z.string().min(1).parse(formData.get("accountNumber"));
  const position = z.coerce.number().int().min(0).parse(formData.get("position") || 0);
  const isActive = formData.get("isActive") === "on";
  const file = formData.get("file");
  const values: Partial<typeof qrCodes.$inferInsert> = {
    bankName,
    accountName,
    accountNumber,
    position,
    isActive,
  };
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadPublicImage("qr", {
      name: file.name,
      type: file.type,
      bytes: await file.arrayBuffer(),
    });
    values.imageUrl = uploaded.url;
  }
  await db().update(qrCodes).set(values).where(eq(qrCodes.id, id));
  await auditLogSubject({ actor: admin.id, action: "QR_UPDATE", targetType: "qr_code", targetId: id });
  revalidatePath("/admin/qr");
}

export async function deleteQrCode(formData: FormData) {
  const admin = await requireAdmin();
  await limitAdmin(admin.id, "qr-delete");
  const id = z.string().min(1).parse(formData.get("id"));
  await db().delete(qrCodes).where(eq(qrCodes.id, id));
  await auditLogSubject({ actor: admin.id, action: "QR_DELETE", targetType: "qr_code", targetId: id });
  revalidatePath("/admin/qr");
}
