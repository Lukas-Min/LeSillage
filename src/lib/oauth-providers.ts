import { getEnv } from "@/lib/env";
import type { OAuthProvider } from "@/lib/oauth-provider-label";

export { oauthProviderLabel, type OAuthProvider } from "@/lib/oauth-provider-label";

export function configuredOAuthProviders(): OAuthProvider[] {
  const env = getEnv();
  const providers: OAuthProvider[] = [];
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) providers.push("google");
  // Facebook login stays off until the app is actually using it.
  return providers;
}
