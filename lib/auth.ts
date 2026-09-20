import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { getDb } from "@/lib/mongodb";
import { roleFor } from "@/lib/roles";
import { getUserProfile, upsertGoogleUser } from "@/lib/user-profile";

const googleProvider = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ? GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    })
  : null;

export function isAdminEmail(email?: string | null) {
  return roleFor(email) === "admin";
}

const useSecureCookies = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions & { trustHost?: boolean } = {
  trustHost: true,
  cookies: {
    sessionToken: {
      name: `${useSecureCookies ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        maxAge: 60 * 60 * 8,
      },
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 hours
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        const configuredEmail = (process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
        const environmentPassword = process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD;

        // Keep the existing MongoDB bcrypt path, with a constant-time
        // environment fallback for deployments without a seeded admin.
        if (environmentPassword && email === configuredEmail) {
          const provided = Buffer.from(credentials.password);
          const expected = Buffer.from(environmentPassword);
          if (provided.length === expected.length && crypto.timingSafeEqual(provided, expected)) {
            return { id: "environment-admin", email, name: "Admin", role: "admin" };
          }
        }

        const db = await getDb();
        const admin = await db.collection("admins").findOne({ email });

        if (!admin) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, admin.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: admin._id.toString(),
          email: admin.email,
          name: admin.name ?? "Admin",
          role: admin.role ?? "admin",
        };
      },
    }),
    ...(googleProvider ? [googleProvider] : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && (!profile || (profile as { email_verified?: boolean }).email_verified !== true || !profile.email)) {
        return false;
      }

      if (account?.provider === "google" && user.email) {
        const profile = await upsertGoogleUser({
          userId: account.providerAccountId,
          email: user.email,
          name: user.name,
          image: user.image,
        });
        if (profile) user.id = profile.id;
        (user as any).role = isAdminEmail(user.email) ? "admin" : "member";
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.role = (user as any).role === "admin" ? "admin" : "member";
        token.userId = user.id;
        token.provider = account?.provider === "google" ? "google" : account?.provider === "credentials" ? "credentials" : undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role === "admin" ? "admin" : "member";
        (session.user as any).id = token.userId ?? token.sub;
        (session.user as any).provider = token.provider;

        if (token.userId && (session.user as any).role !== "admin") {
          const profile = await getUserProfile(String(token.userId));
          if (profile) {
            session.user.name = profile.username;
            session.user.image = profile.avatarUrl;
            (session.user as any).profile = profile;
          }
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      try {
        const destination = new URL(url, baseUrl);
        if (destination.origin !== baseUrl) return `${baseUrl}/profile`;
        const allowedPath = destination.pathname === "/admin" || destination.pathname === "/profile" || destination.pathname === "/";
        return allowedPath ? destination.toString() : `${baseUrl}/profile`;
      } catch {
        return `${baseUrl}/profile`;
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
