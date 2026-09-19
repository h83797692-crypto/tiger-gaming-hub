import { SessionProviderWrapper } from "@/components/admin/SessionProviderWrapper";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <SessionProviderWrapper>{children}</SessionProviderWrapper>;
}
