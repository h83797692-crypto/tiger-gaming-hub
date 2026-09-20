"use client";

import { SessionProvider } from "next-auth/react";

export function SessionProviderWrapper({ children }: { children: React.ReactNode }) {
  return <SessionProvider refetchOnWindowFocus refetchWhenOffline={false}>{children}</SessionProvider>;
}
