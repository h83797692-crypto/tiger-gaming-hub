"use client";

import { useEffect, useState } from "react";
import { Palette, Save, Trash2 } from "lucide-react";
import { ROLE_DEFINITIONS, type CommunityRole, type RoleDefinition } from "@/lib/roles";

type EditableRole = RoleDefinition & { role: CommunityRole };

export function RoleManagement() {
  const [roles, setRoles] = useState<EditableRole[]>([]);
  const [notice, setNotice] = useState("");
  useEffect(() => { fetch("/api/admin/roles", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((payload) => setRoles(payload?.roles ?? Object.entries(ROLE_DEFINITIONS).map(([role, value]) => ({ role: role as CommunityRole, ...value })))); }, []);
  async function save(role: EditableRole) { const response = await fetch("/api/admin/roles", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(role) }); setNotice(response.ok ? "تم حفظ الرتبة" : "تعذر حفظ الرتبة"); }
  async function remove(role: CommunityRole) { const response = await fetch(`/api/admin/roles?role=${role}`, { method: "DELETE" }); if (response.ok) setRoles((current) => current.filter((item) => item.role !== role)); else setNotice("لا يمكن حذف هذه الرتبة"); }
  return <section className="admin-block" dir="rtl"><div className="admin-block__heading"><h4><Palette size={17} /> خصائص الرتب</h4><span className="admin-hint">الرتب الأساسية ثابتة، ويمكن تخصيص الاسم واللون والأيموجي</span></div><div className="admin-stack">{roles.map((role) => <div className="admin-row" key={role.role}><span className="text-2xl">{role.emoji}</span><label className="admin-field">الاسم<input className="admin-input" value={role.label} onChange={(event) => setRoles((current) => current.map((item) => item.role === role.role ? { ...item, label: event.target.value } : item))} /></label><label className="admin-field">الأيموجي<input className="admin-input" value={role.emoji} onChange={(event) => setRoles((current) => current.map((item) => item.role === role.role ? { ...item, emoji: event.target.value } : item))} /></label><label className="admin-field">اللون<input className="h-10 w-16" type="color" value={role.color} onChange={(event) => setRoles((current) => current.map((item) => item.role === role.role ? { ...item, color: event.target.value } : item))} /></label><button type="button" className="admin-refresh" onClick={() => save(role)}><Save size={15} /> حفظ</button>{role.role !== "member" && role.role !== "admin" && <button type="button" className="admin-refresh" onClick={() => remove(role.role)}><Trash2 size={15} /> حذف التخصيص</button>}</div>)}</div>{notice && <p className="admin-hint">{notice}</p>}</section>;
}