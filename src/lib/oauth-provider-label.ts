// Kept apart from oauth-providers.ts, which reads the server env (and so
// zod's env schema): client components import the label from here.
export type OAuthProvider = "google" | "facebook";

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
