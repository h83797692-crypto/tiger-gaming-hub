"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { SiteContent } from "@/lib/site-content";

export function ContentForm({ initial }: { initial: SiteContent }) {
  const [form, setForm] = useState({
    siteName: initial.siteName,
    slogan: initial.slogan,
    heroHeadline: initial.heroHeadline,
    heroSubheading: initial.heroSubheading,
    aboutTitle: initial.aboutTitle,
    aboutBody: initial.aboutBody,
    contactEmail: initial.contactEmail,
    contactPhone: initial.contactPhone,
  });
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save");
      }
      toast.success("Content updated — live on the site now.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Content</CardTitle>
      </CardHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="siteName">Site Name</Label>
          <Input id="siteName" value={form.siteName} onChange={(e) => update("siteName", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="slogan">Slogan</Label>
          <Input id="slogan" value={form.slogan} onChange={(e) => update("slogan", e.target.value)} />
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="heroHeadline">Hero Headline</Label>
        <Input
          id="heroHeadline"
          value={form.heroHeadline}
          onChange={(e) => update("heroHeadline", e.target.value)}
        />
      </div>

      <div className="mt-4">
        <Label htmlFor="heroSubheading">Hero Subheading</Label>
        <Textarea
          id="heroSubheading"
          value={form.heroSubheading}
          onChange={(e) => update("heroSubheading", e.target.value)}
        />
      </div>

      <div className="mt-4">
        <Label htmlFor="aboutTitle">About — Title</Label>
        <Input id="aboutTitle" value={form.aboutTitle} onChange={(e) => update("aboutTitle", e.target.value)} />
      </div>

      <div className="mt-4">
        <Label htmlFor="aboutBody">About — Body</Label>
        <Textarea
          id="aboutBody"
          rows={5}
          value={form.aboutBody}
          onChange={(e) => update("aboutBody", e.target.value)}
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={form.contactEmail}
            onChange={(e) => update("contactEmail", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <Input
            id="contactPhone"
            value={form.contactPhone}
            onChange={(e) => update("contactPhone", e.target.value)}
          />
        </div>
      </div>

      <Button className="mt-6" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </Card>
  );
}
