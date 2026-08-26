import { db } from "@/db/client";
import { qrCodes } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function QrAdminPage() {
  const rows = await db().select().from(qrCodes).orderBy(qrCodes.position);
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">QR codes</h1>
      {rows.map((qr) => (
        <Card key={qr.id}>
          <CardContent className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr.imageUrl} alt={`${qr.bankName} QR`} className="h-24 w-24 rounded border object-contain" />
            <div>
              <p className="font-medium">{qr.bankName}</p>
              <p className="text-xs text-muted-foreground">{qr.accountName} · {qr.accountNumber}</p>
              <p className="text-xs">Active: {qr.isActive ? "Yes" : "No"}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}