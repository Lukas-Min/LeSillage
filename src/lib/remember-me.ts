import { cookies } from "next/headers";

export const SESSION_MAX_AGE_REMEMBERED_S = 30 * 24 * 60 * 60;

const REMEMBER_CHOICE_COOKIE = "le-sillage-remember-me";
const BROWSER_SESSION_COOKIE = "le-sillage-browser-session";

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export function parseRememberMe(value: FormDataEntryValue | null): boolean {
  const raw = String(value ?? "");
  return raw === "1" || raw === "on" || raw === "true";
}

/** Survives the OAuth redirect. Read once when the JWT is first issued. */
export async function persistRememberMeChoice(remember: boolean): Promise<void> {
  const store = await cookies();
  store.set(REMEMBER_CHOICE_COOKIE, remember ? "1" : "0", {
    ...cookieBase,
    maxAge: 10 * 60,
  });
}

export async function consumeRememberMeChoice(): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(REMEMBER_CHOICE_COOKIE)?.value;
  store.delete(REMEMBER_CHOICE_COOKIE);
  return raw !== "0";
}

export async function applyRememberMeSession(remember: boolean): Promise<void> {
  const store = await cookies();
  if (remember) {
    store.delete(BROWSER_SESSION_COOKIE);
    return;
  }
  // No maxAge: the browser drops this when it closes, which ends an unchecked login.
  store.set(BROWSER_SESSION_COOKIE, "1", cookieBase);
}

export async function hasBrowserSessionMarker(): Promise<boolean> {
  const store = await cookies();
  return store.get(BROWSER_SESSION_COOKIE)?.value === "1";
}
