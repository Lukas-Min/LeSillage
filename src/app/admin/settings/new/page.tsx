import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { optionLists } from "@/db/schema";
import { OptionValueForm } from "@/components/admin/option-value-form";
import { listTitle } from "@/components/admin/option-list-shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaHeader, PAGE_ACTION_CLASS } from "@/components/ui/page-layout";

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
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Settings"
        title="Add a value"
        subtitle={listTitle(list.key)}
        actions={
          <Button asChild variant="outline" className={PAGE_ACTION_CLASS}>
            <Link href="/admin/settings">Back</Link>
          </Button>
        }
      />
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
