import { SessionProviderWrapper } from "@/components/admin/SessionProviderWrapper";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProviderWrapper>
      <div className="min-h-screen">
        <AdminNav />
        <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 md:px-6 md:py-10">{children}</div>
      </div>
    </SessionProviderWrapper>
  );
}
