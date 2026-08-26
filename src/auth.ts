import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
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

const env = getEnv();
const ADMIN_EMAIL = env.ADMIN_EMAIL.toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  trustHost: true,
  session: { strategy: "database" },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [Google({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET })]
      : []),
    ...(env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET
      ? [Facebook({ clientId: env.FACEBOOK_CLIENT_ID, clientSecret: env.FACEBOOK_CLIENT_SECRET })]
      : []),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return true;
      const client = db();
      const role: UserRole = user.email.toLowerCase() === ADMIN_EMAIL ? "ADMIN" : "CUSTOMER";
      const existing = (
        await client.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, user.email.toLowerCase()))
      )[0];
      if (!existing) return true;
      if (existing.role !== role) {
        await client.update(users).set({ role }).where(eq(users.id, existing.id));
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        (session.user as { role?: string }).role = (user as { role?: string }).role ?? "CUSTOMER";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;
      const role: UserRole = user.email.toLowerCase() === ADMIN_EMAIL ? "ADMIN" : "CUSTOMER";
      await db().update(users).set({ role }).where(eq(users.id, user.id as string));
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
