import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { authErrorMessage } from "@/lib/auth-errors";
import { SignInForm } from "@/components/store/sign-in-form";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string; msg?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const returnTo = params.returnTo && params.returnTo.startsWith("/") ? params.returnTo : "/";
  if (session?.user) redirect(returnTo);
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-serif-display text-2xl">Sign in to Le Sillage</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use email and password, or continue with Google or Facebook.
      </p>
      <SignInForm returnTo={returnTo} errorMessage={authErrorMessage(params.error, params.msg)} />
    </main>
  );
}
