import { getGamingContent } from "@/lib/gaming-content";
import { getLeaderboard } from "@/lib/leaderboard-content";
import { getSocialSettings } from "@/lib/settings";
import { AdminDashboardTabs } from "@/components/admin/AdminDashboardTabs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") redirect(session?.user ? "/profile" : "/admin/login");
  const content = await getGamingContent();
  const leaderboard = await getLeaderboard();
  const socialSettings = await getSocialSettings();

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">TIGER GAMING / CONTROL ROOM</p>
        <h1 className="mt-2 text-3xl font-black text-white">لوحة التحكم الشاملة</h1>
        <p className="mt-2 text-sm text-white/50">تحكم بالنصوص، الألعاب، البطولات، الصور والفيديو من مكان واحد.</p>
      </div>
      <AdminDashboardTabs content={content} leaderboard={leaderboard} socialSettings={socialSettings} />
    </div>
  );
}
