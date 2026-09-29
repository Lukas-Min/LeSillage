import Link from "next/link";
import { confirmNewsletter } from "@/actions/newsletter-actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { isValidEmailLink } from "@/lib/email-links";

export const metadata = { title: "Confirm your subscription" };

// A button rather than confirm-on-open: mail scanners open links in emails
// before the recipient does, and that must not confirm a sign-up for them.
export default async function NewsletterConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string; status?: string }>;
}) {
  const { email = "", token = "", status } = await searchParams;
  const valid = isValidEmailLink("newsletter-confirm", email, token);

  return (
    <main className="mx-auto w-full max-w-lg space-y-4 px-4 py-10">
      <h1 className="font-serif-display text-3xl">News and promotions</h1>
      {status === "confirmed" ? (
        <>
          <p role="status" className="text-sm">
            You&apos;re subscribed. New fragrances, restocks, and limited offers will come by email.
          </p>
          <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
            <Link href="/shop">Back to the shop</Link>
          </Button>
        </>
      ) : status === "invalid" || !valid ? (
        <p className="text-sm text-muted-foreground">
          This confirmation link isn&apos;t valid. Sign up again from the Contact page and use the link in the new email.
        </p>
      ) : (
        <form action={confirmNewsletter} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="token" value={token} />
          <p className="text-sm">
            Confirm news and promotions for <span className="font-medium break-all">{email}</span>. You can unsubscribe
            from any of our emails.
          </p>
          <SubmitButton variant="gold" pendingLabel="Confirming…" className="h-11 w-full sm:w-auto">
            Confirm
          </SubmitButton>
        </form>
      )}
    </main>
  );
}
