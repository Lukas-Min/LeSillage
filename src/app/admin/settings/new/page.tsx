import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { optionLists } from "@/db/schema";
import { OptionValueForm } from "@/components/admin/option-value-form";
import { listTitle } from "@/components/admin/option-list-shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewOptionValuePage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string }>;
}) {
  const { list: listKey = "" } = await searchParams;
  const list = (await db().select().from(optionLists).where(eq(optionLists.key, listKey)))[0];
  if (!list) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-2xl">Add a value</h1>
          <p className="text-sm text-muted-foreground">{listTitle(list.key)}</p>
        </div>
        <Button asChild variant="outline" className="h-11">
          <Link href="/admin/settings">Back</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New value</CardTitle>
        </CardHeader>
        <CardContent>
          <OptionValueForm listKey={list.key} />
        </CardContent>
      </Card>
    </div>
  );
}
