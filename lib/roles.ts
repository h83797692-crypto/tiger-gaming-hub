export type Role = "admin" | "member";

export type CommunityRole = "admin" | "moderator" | "vip" | "member";

export type RoleDefinition = { label: string; color: string; emoji: string; permissions: string[] };
export const ROLE_DEFINITIONS: Record<CommunityRole, RoleDefinition> = {
  admin: { label: "Admin", color: "#ff8a00", emoji: "👑", permissions: ["manage_users", "manage_content", "moderate_chat"] },
  moderator: { label: "Moderator", color: "#00f0ff", emoji: "🛡️", permissions: ["moderate_chat", "delete_messages"] },
  vip: { label: "VIP", color: "#c084fc", emoji: "⭐", permissions: ["vip_badge"] },
  member: { label: "Member", color: "#94a3b8", emoji: "🎮", permissions: [] },
};

export function normaliseRoles(value: unknown): CommunityRole[] {
  const roles = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const valid = roles.filter((role): role is CommunityRole => role in ROLE_DEFINITIONS);
  return valid.length > 0 ? Array.from(new Set(valid)) : ["member"];
}

export function primaryRole(value: unknown): CommunityRole {
  const roles = normaliseRoles(value);
  return roles.includes("admin") ? "admin" : roles.includes("moderator") ? "moderator" : roles.includes("vip") ? "vip" : "member";
}

function adminEmails() {
  return [
    process.env.ADMIN_EMAIL,
    process.env.SEED_ADMIN_EMAIL,
    ...(process.env.ADMIN_EMAILS ?? "").split(","),
  ]
    .map((email) => email?.trim().toLowerCase())
    .filter(Boolean);
}

export function roleFor(email?: string | null): Role {
  return email && adminEmails().includes(email.trim().toLowerCase()) ? "admin" : "member";
}