import Link from "next/link";
import { ArrowLeft, Eye, MessageCircle, Share2, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

const STEPS = [
  { icon: Eye, title: "شاهد بتركيز", text: "شاهد فيديوهات YouTube المدمجة أثناء بقاء الصفحة مفتوحة. يحتسب النظام وقت التشغيل الفعلي فقط." },
  { icon: MessageCircle, title: "شارك في الشات", text: "أرسل رسالة حقيقية في غرفة البث لتحصل على مكافأة الشات اليومية." },
  { icon: Share2, title: "شارك الرابط", text: "شارك محتوى Tiger Gaming عبر أدوات المشاركة المتاحة عند تفعيل المهمة." },
  { icon: Trophy, title: "استبدل مكافآتك", text: "استخدم XP من متجر المكافآت وافتح مزايا المجتمع والجوائز." },
];

export default function XpGuidePage() {
  return <main className="section-shell xp-guide" dir="rtl"><div className="section-heading"><p className="eyebrow">TIGER XP / GUIDE</p><h1>كيف يعمل نظام XP؟</h1><p>اجمع النقاط من نشاط حقيقي داخل المجتمع، وتابع تقدمك من ملف اللاعب.</p></div><div className="xp-guide__grid">{STEPS.map(({ icon: Icon, title, text }) => <article className="hud-panel xp-guide__card" key={title}><span className="xp-guide__icon"><Icon size={20} /></span><h2>{title}</h2><p>{text}</p></article>)}</div><Link href="/profile" className="gaming-button"><ArrowLeft size={17} /> افتح ملف اللاعب</Link></main>;
}