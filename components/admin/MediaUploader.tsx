"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageField } from "@/components/admin/ImageField";

/**
 * Hero image manager. The upload-vs-URL switch lives in <ImageField>, so both
 * paths write to the same heroImageUrl field.
 */
export function MediaUploader({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroImageUrl: url }),
      });
      if (!res.ok) throw new Error("تعذر حفظ صورة الواجهة");
      toast.success("تم تحديث صورة الواجهة");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>صورة الواجهة</CardTitle>
      </CardHeader>

      <div className="admin-stack">
        <ImageField label="الصورة" value={url} onChange={setUrl} />
        <Button onClick={save} disabled={saving}>
          {saving ? "جارٍ الحفظ…" : "حفظ الصورة"}
        </Button>
      </div>
    </Card>
  );
}
