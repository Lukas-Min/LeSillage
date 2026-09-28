import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

export function EmailCodePanel({
  sentTo,
  verifyAction,
  resendAction,
  hiddenFields = [],
  errorMessage,
}: {
  sentTo: string;
  verifyAction: (formData: FormData) => void | Promise<void>;
  resendAction?: (formData: FormData) => void | Promise<void>;
  hiddenFields?: { name: string; value: string }[];
  errorMessage?: string | null;
}) {
  return (
    <>
      <h1 className="font-serif-display text-2xl">Check your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the 6-digit code we sent to {sentTo || "your email"}.
      </p>
      <Card className="mt-6">
        <CardContent className="space-y-6 p-6">
          <form action={verifyAction} className="space-y-3">
            {hiddenFields.map((field) => (
              <input key={field.name} type="hidden" name={field.name} value={field.value} />
            ))}
            <div className="space-y-1">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                className="h-11 tracking-[0.4em]"
              />
            </div>
            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
            <SubmitButton className="h-11 w-full rounded-md sm:ml-auto sm:block sm:w-fit" variant="gold" pendingLabel="Sending…">
              Continue
            </SubmitButton>
          </form>
          {resendAction ? (
            <form action={resendAction}>
              {hiddenFields.map((field) => (
                <input key={field.name} type="hidden" name={field.name} value={field.value} />
              ))}
              <SubmitButton variant="ghost" className="h-11 w-full sm:ml-auto sm:block sm:w-fit" pendingLabel="Sending…">
                Resend code
              </SubmitButton>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
