import { Card, CardContent } from "@/components/ui/card";
import { getEnv } from "@/lib/env";

export default function ContactPage() {
  const env = getEnv();
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
      <h1 className="font-serif-display text-2xl">Contact</h1>
      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <p>For order questions: {env.GMAIL_USER}</p>
          {env.NEXT_PUBLIC_PHONE ? <p>Phone: {env.NEXT_PUBLIC_PHONE}</p> : null}
          <p>Pickup: {env.NEXT_PUBLIC_PICKUP_NOTES ?? "By appointment only."}</p>
        </CardContent>
      </Card>
    </main>
  );
}