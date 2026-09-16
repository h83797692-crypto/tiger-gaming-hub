import { getSocialSettings } from "@/lib/settings";
import { SocialSettingsForm } from "@/components/admin/SocialSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
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