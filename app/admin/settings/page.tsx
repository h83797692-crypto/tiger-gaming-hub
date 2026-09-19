import { getSocialSettings } from "@/lib/settings";
import { SocialSettingsForm } from "@/components/admin/SocialSettingsForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") redirect(session?.user ? "/profile" : "/admin/login");
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">TIGER GAMING / SETTINGS</p>
        <h1 className="mt-2 text-3xl font-black text-white">إعدادات التواصل والدعم</h1>
        <p className="mt-2 text-sm text-white/50">حدّث روابط Social Hub وطرق دعم مجتمع Tiger Gaming.</p>
      </div>
      <SocialSettingsForm initial={await getSocialSettings()} />
    </div>
  );
}