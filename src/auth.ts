import { cache } from "react";
import NextAuth from "next-auth";
import type { DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/client";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  type UserRole,
} from "@/db/schema";
import { getEnv } from "@/lib/env";
import { verifyPassword } from "@/lib/password";

const env = getEnv();
const ADMIN_EMAIL = env.ADMIN_EMAIL.toLowerCase();

export const getUserAuthState = cache(async (userId: string) => {
  const row = (
    await db()
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        sessionVersion: users.sessionVersion,
        deletedAt: users.deletedAt,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.id, userId))
  )[0];
  return row ?? null;
});

async function promoteAdmin(email: string | null | undefined, userId: string) {
  if (!email) return;
  const role: UserRole = email.toLowerCase() === ADMIN_EMAIL ? "ADMIN" : "CUSTOMER";
  await db().update(users).set({ role }).where(eq(users.id, userId));
  return role;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET
      ? [
          Facebook({
            clientId: env.FACEBOOK_CLIENT_ID,
            clientSecret: env.FACEBOOK_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
            checks: ["state"],
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const user = (
          await db()
            .select()
            .from(users)
            .where(eq(users.email, email))
        )[0];
        if (!user || user.deletedAt || !user.passwordHash || !user.emailVerified) return null;
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;
        const role: UserRole = email === ADMIN_EMAIL ? "ADMIN" : user.role;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.id) return true;
      const state = await getUserAuthState(user.id);
      if (state?.deletedAt) return false;
      if (user.email) await promoteAdmin(user.email, user.id);
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as { role?: UserRole }).role ?? "CUSTOMER";
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 0;
      }
      if (!token.sub) return token;
      const state = await getUserAuthState(token.sub);
      if (!state || state.deletedAt) return {};
      if (typeof token.sessionVersion === "number" && state.sessionVersion !== token.sessionVersion) {
        return {};
      }
      token.role = state.role;
      token.sessionVersion = state.sessionVersion;
      token.email = state.email;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        (session.user as { role?: string }).role = (token.role as string) ?? "CUSTOMER";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      await promoteAdmin(user.email, user.id);
    },
  },
});

export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  const role = (session.user as { role?: string }).role ?? "CUSTOMER";
  if (role !== "ADMIN") throw new Error("FORBIDDEN");
  return { id: session.user.id as string, email: session.user.email as string };
}

export async function requireActiveCustomer(): Promise<{ id: string; email: string; name: string | null }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Please sign in");
  const state = await getUserAuthState(session.user.id);
  if (!state || state.deletedAt) throw new Error("Please sign in");
  return {
    id: state.id,
    email: state.email ?? session.user.email ?? "",
    name: session.user.name ?? null,
  };
}

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string; role?: UserRole };
  }
  interface User {
    role?: UserRole;
    sessionVersion?: number;
  }
}
