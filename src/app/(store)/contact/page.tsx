import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Eyebrow } from "@/components/ui/section";
import { getEnv } from "@/lib/env";

export default function ContactPage() {
  const env = getEnv();
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <header className="space-y-2">
        <Eyebrow>Help</Eyebrow>
        <h1 className="font-serif-display text-4xl">Contact</h1>
      </header>
      <Card className="rounded-md">
        <CardContent className="space-y-2 p-6 text-sm">
          <p>For order questions: {env.GMAIL_USER}</p>
          {env.NEXT_PUBLIC_PHONE ? <p>Phone: {env.NEXT_PUBLIC_PHONE}</p> : null}
          <p>Pickup: {env.NEXT_PUBLIC_PICKUP_NOTES ?? "By appointment only."}</p>
        </CardContent>
      </Card>
    </main>
  );
}
