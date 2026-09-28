import { resendSignupCode, verifyEmailCode } from "@/actions/auth-credentials-actions";
import { EmailCodePanel } from "@/components/store/email-code-panel";
import { authErrorMessage } from "@/lib/auth-errors";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; returnTo?: string; error?: string; msg?: string }>;
}) {
  const params = await searchParams;
  const email = params.email ?? "";
  const returnTo = params.returnTo && params.returnTo.startsWith("/") ? params.returnTo : "/account";
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <EmailCodePanel
        sentTo={email || "your inbox"}
        errorMessage={authErrorMessage(params.error, params.msg)}
        verifyAction={verifyEmailCode}
        resendAction={resendSignupCode}
        hiddenFields={[
          { name: "email", value: email },
          { name: "returnTo", value: returnTo },
        ]}
      />
    </main>
  );
}
