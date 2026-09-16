import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { getDb } from "@/lib/mongodb";

export const authOptions: NextAuthOptions = {
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
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role ?? "admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
