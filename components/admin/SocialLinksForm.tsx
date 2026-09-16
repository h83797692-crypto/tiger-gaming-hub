"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SocialLinks } from "@/lib/site-content";

const FIELDS: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/reemweb" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/reemweb" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/1234567890" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/reemweb" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@reemweb" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/reemweb" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/reemweb" },
];

export function SocialLinksForm({ initial }: { initial: SocialLinks }) {
  const [links, setLinks] = useState<SocialLinks>(initial);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socialLinks: links }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save");
      }
      toast.success("Social links updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Media Links</CardTitle>
      </CardHeader>

      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              placeholder={placeholder}
              value={links[key] ?? ""}
              onChange={(e) => setLinks((l) => ({ ...l, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <Button className="mt-6" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Social Links"}
      </Button>
    </Card>
  );
}
