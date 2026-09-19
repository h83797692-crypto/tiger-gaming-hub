"use client";

import { useEffect, useState } from "react";
import { Search, Save, ShieldCheck, UserRound } from "lucide-react";
import { ROLE_DEFINITIONS, type RoleDefinition } from "@/lib/roles";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  roles: string[];
  permissions: string[];
  xp: number;
  online: boolean;
};

type RoleOption = RoleDefinition & { role: string };

export function UserManagement() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/admin/roles", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setRoles(payload?.roles ?? Object.entries(ROLE_DEFINITIONS).map(([role, value]) => ({ role, ...value }))));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch(`/api/admin/users?q=${encodeURIComponent(query)}`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => setUsers(payload?.users ?? []));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  function chooseUser(user: ManagedUser) {
    setSelected(user);
    setSelectedRoles(user.roles);
    setNotice("");
  }

  function toggleRole(role: string) {
    setSelectedRoles((current) => role === "member" ? ["member"] : current.includes(role) ? current.filter((item) => item !== role) : [...current.filter((item) => item !== "member"), role]);
  }

  async function save() {
    if (!selected || selectedRoles.length === 0) return;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selected.id, roles: selectedRoles }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "تعذر حفظ الرتب");
      setSelected({ ...selected, roles: payload.roles });
      setUsers((current) => current.map((user) => user.id === selected.id ? { ...user, roles: payload.roles } : user));
      setNotice("تم حفظ رتب المستخدم");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return <section className="admin-stack" dir="rtl">
    <div className="admin-block">
      <div className="admin-block__heading"><h4><ShieldCheck size={17} /> إدارة المستخدمين والرتب</h4><span className="admin-hint">لا تظهر هذه البيانات إلا للأدمن</span></div>
      <label className="admin-field"><span>البحث بالاسم أو البريد</span><span className="relative"><Search size={16} className="pointer-events-none absolute start-3 top-3 text-white/40" /><input className="admin-input ps-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اكتب اسمًا أو بريدًا..." autoComplete="off" /></span></label>
      <div className="admin-user-suggestions">{users.slice(0, 12).map((user) => <button type="button" key={user.id} onClick={() => chooseUser(user)} className={`admin-user-suggestion${selected?.id === user.id ? " is-active" : ""}`}><span className="admin-user-suggestion__avatar relative block h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/10">{user.avatarUrl ? <img src={user.avatarUrl} alt="" className="block h-full w-full object-cover" /> : <UserRound size={17} className="m-2" />}<i className={`absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full border-2 border-[#0d121f] ${user.online ? "bg-emerald-400" : "bg-white/20"}`} /></span><span className="min-w-0 text-start"><strong className="block truncate">{user.name}</strong><small className="block truncate text-white/40">{user.email}</small></span><b className="ms-auto text-xs text-[#00F0FF]">{user.xp.toLocaleString("en")} XP</b></button>)}</div>
    </div>
    {selected && <div className="admin-block"><div className="admin-block__heading"><h4>{selected.name}</h4><span className="text-xs text-white/50">{selected.email} · {selected.online ? "متصل" : "غير متصل"}</span></div><div className="admin-grid">{roles.map((role) => <label key={role.role} className="admin-field flex-row items-center gap-3"><input type="checkbox" checked={selectedRoles.includes(role.role)} onChange={() => toggleRole(role.role)} disabled={role.role === "member" && selectedRoles.length > 1} /><span><strong style={{ color: role.color }}>{role.label}</strong><small className="block text-white/40">{role.permissions.join(" · ") || "صلاحيات اللاعب الأساسية"}</small></span></label>)}</div><button type="button" className="gaming-button" onClick={save} disabled={saving}><Save size={15} /> {saving ? "جارٍ الحفظ..." : "حفظ الرتب"}</button>{notice && <p className="admin-hint">{notice}</p>}</div>}
  </section>;
}