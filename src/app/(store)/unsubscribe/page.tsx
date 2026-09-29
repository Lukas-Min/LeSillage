import Link from "next/link";
import { unsubscribeFromEmails } from "@/actions/newsletter-actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { isValidEmailLink } from "@/lib/email-links";
import { FORM_ACTION_CLASS } from "@/components/ui/form-action";

export const metadata = { title: "Unsubscribe" };

// A button, not an unsubscribe-on-open link: mail scanners open links in
// emails before the recipient does, and that must not unsubscribe anyone.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string; status?: string }>;
}) {
  const { email = "", token = "", status } = await searchParams;
  const valid = isValidEmailLink("unsubscribe", email, token);

  return (
    <main className="mx-auto w-full max-w-lg space-y-4 px-4 py-10">
      <h1 className="font-serif-display text-3xl">Unsubscribe</h1>
      {status === "done" ? (
        <>
          <p role="status" className="text-sm">
            You&apos;re unsubscribed. We won&apos;t send you news or promotions. Order emails still arrive as usual.
          </p>
          <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
            <Link href="/shop">Back to the shop</Link>
          </Button>
        </>
      ) : status === "invalid" || !valid ? (
        <p className="text-sm text-muted-foreground">
          This unsubscribe link isn&apos;t valid. Use the link at the bottom of our latest email, turn off news and
          promotions under Account → Notifications, or reply to any of our emails.
        </p>
      ) : (
        <form action={unsubscribeFromEmails} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="token" value={token} />
          <p className="text-sm">
            Stop news and promotions to <span className="font-medium break-all">{email}</span>? Order emails still
            arrive as usual.
          </p>
          <SubmitButton pendingLabel="Unsubscribing…" className={FORM_ACTION_CLASS}>
            Unsubscribe
          </SubmitButton>
        </form>
      )}
    </main>
  );
}
