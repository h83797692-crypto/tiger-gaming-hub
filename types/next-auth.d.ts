import "next-auth";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: "admin" | "member";
    id: string;
  }
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: "admin" | "member";
      profile?: {
        id: string;
        email: string;
        name: string;
        username: string;
        avatarUrl: string;
        frame: "champion" | null;
        frameEnabled: boolean;
      };
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "member";
    userId?: string;
  }
}
