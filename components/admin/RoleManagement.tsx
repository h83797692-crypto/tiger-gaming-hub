"use client";

import { useEffect, useState } from "react";
import { Palette, Plus, Save, Trash2 } from "lucide-react";
import { ROLE_DEFINITIONS, type CommunityRole, type RoleDefinition } from "@/lib/roles";

type EditableRole = RoleDefinition & { role: string };
type NewRole = Pick<RoleDefinition, "label" | "emoji" | "color">;

const EMPTY_ROLE: NewRole = { label: "", emoji: "🎮", color: "#94a3b8" };

export function RoleManagement() {
  const [roles, setRoles] = useState<EditableRole[]>([]);
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<NewRole>(EMPTY_ROLE);

  async function loadRoles() {
    const response = await fetch("/api/admin/roles", { cache: "no-store" });
    const payload = response.ok ? await response.json() : null;
    setRoles(payload?.roles ?? Object.entries(ROLE_DEFINITIONS).map(([role, value]) => ({ role, ...value })));
  }

  useEffect(() => { void loadRoles(); }, []);

  async function save(role: EditableRole) {
    const response = await fetch("/api/admin/roles", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(role) });
    setNotice(response.ok ? "تم حفظ الرتبة" : "تعذر حفظ الرتبة");
    if (response.ok) await loadRoles();
  }

  async function createRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    const response = await fetch("/api/admin/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setNotice(payload.error ?? "تعذر إنشاء الرتبة"); return; }
    setDraft(EMPTY_ROLE);
    setFormOpen(false);
    setNotice("تم إنشاء الرتبة");
    await loadRoles();
  }

  async function remove(role: string) {
    const response = await fetch(`/api/admin/roles?role=${encodeURIComponent(role)}`, { method: "DELETE" });
    if (response.ok) { setRoles((current) => current.filter((item) => item.role !== role)); setNotice("تم حذف التخصيص"); } else setNotice("لا يمكن حذف هذه الرتبة");
  }

  return <section className="admin-block" dir="rtl">
    <div className="admin-block__heading"><div><h4><Palette size={17} /> خصائص الرتب</h4><span className="admin-hint">الرتب الأساسية ثابتة، ويمكن تخصيص الاسم واللون والأيموجي</span></div><button type="button" className="admin-refresh" onClick={() => { setFormOpen((open) => !open); setNotice(""); }}><Plus size={15} /> {formOpen ? "إغلاق" : "إضافة رتبة"}</button></div>
    {formOpen && <form className="admin-block" onSubmit={createRole}><div className="admin-grid"><label className="admin-field">اسم الرتبة<input className="admin-input" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} required maxLength={40} /></label><label className="admin-field">الأيموجي<input className="admin-input" value={draft.emoji} onChange={(event) => setDraft({ ...draft, emoji: event.target.value })} required maxLength={8} /></label><label className="admin-field">اللون<input className="h-10 w-16" type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} /></label></div><button type="submit" className="gaming-button"><Save size={15} /> حفظ الرتبة</button></form>}
    <div className="admin-stack">{roles.map((role) => <div className="admin-row" key={role.role}><span className="text-2xl">{role.emoji}</span><label className="admin-field">الاسم<input className="admin-input" value={role.label} onChange={(event) => setRoles((current) => current.map((item) => item.role === role.role ? { ...item, label: event.target.value } : item))} /></label><label className="admin-field">الأيموجي<input className="admin-input" value={role.emoji} onChange={(event) => setRoles((current) => current.map((item) => item.role === role.role ? { ...item, emoji: event.target.value } : item))} /></label><label className="admin-field">اللون<input className="h-10 w-16" type="color" value={role.color} onChange={(event) => setRoles((current) => current.map((item) => item.role === role.role ? { ...item, color: event.target.value } : item))} /></label><button type="button" className="admin-refresh" onClick={() => save(role)}><Save size={15} /> حفظ</button>{role.role !== "member" && role.role !== "admin" && <button type="button" className="admin-refresh" onClick={() => remove(role.role)}><Trash2 size={15} /> حذف التخصيص</button>}</div>)}</div>{notice && <p className="admin-hint">{notice}</p>}
  </section>;
}