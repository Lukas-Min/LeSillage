import { notFound } from "next/navigation";
import {
  confirmEmailChange,
  confirmPasswordChange,
  resendEmailChangeCode,
  resendPasswordChangeCode,
} from "@/actions/account-actions";
import { requireActiveCustomer } from "@/auth";
import { EmailCodePanel } from "@/components/store/email-code-panel";
import { authErrorMessage } from "@/lib/auth-errors";

export const dynamic = "force-dynamic";

type Purpose = "password" | "email";

function parsePurpose(value: string | undefined): Purpose | null {
  if (value === "password" || value === "email") return value;
  return null;
}

export default async function AccountVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ purpose?: string; email?: string; error?: string; msg?: string }>;
}) {
  const params = await searchParams;
  const purpose = parsePurpose(params.purpose);
  if (!purpose) notFound();
  const user = await requireActiveCustomer();
  const errorMessage = authErrorMessage(params.error, params.msg);

  if (purpose === "password") {
    return (
      <div className="mx-auto w-full max-w-md">
        <EmailCodePanel
          sentTo={user.email}
          errorMessage={errorMessage}
          verifyAction={confirmPasswordChange}
          resendAction={resendPasswordChangeCode}
        />
      </div>
    );
  }

  const email = params.email?.trim().toLowerCase() ?? "";
  if (!email) notFound();
  return (
    <div className="mx-auto w-full max-w-md">
      <EmailCodePanel
        sentTo={email}
        errorMessage={errorMessage}
        verifyAction={confirmEmailChange}
        resendAction={resendEmailChangeCode}
        hiddenFields={[{ name: "email", value: email }]}
      />
    </div>
  );
}
