import { getEnv } from "@/lib/env";

export type OAuthProvider = "google" | "facebook";

export function configuredOAuthProviders(): OAuthProvider[] {
  const env = getEnv();
  const providers: OAuthProvider[] = [];
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) providers.push("google");
  // Facebook login stays off until the app is actually using it.
  return providers;
}

export function oauthProviderLabel(provider: OAuthProvider): string {
  switch (provider) {
    case "google":
      return "Google";
    case "facebook":
      return "Facebook";
    default: {
      const exhaustive: never = provider;
      return exhaustive;
    }
  }
}
