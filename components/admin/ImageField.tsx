"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

type Mode = "upload" | "url";

/**
 * Image URL-or-upload toggle.
 *
 * Both tabs ultimately write to the SAME `value` (the imageUrl field consumed
 * by games/videos content) — the tab only changes how the admin supplies it.
 */
export function ImageField({
  label,
  value,
  onChange,
  accept = "image/png,image/jpeg,image/webp,image/svg+xml",
  preview = true,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  preview?: boolean;
}) {
  // Default to whichever tab matches the value already stored.
  const [mode, setMode] = useState<Mode>(value && !value.startsWith("/uploads/") ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/media/upload", { method: "POST", body });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "فشل رفع الملف");
      }

      const { url } = await res.json();
      onChange(url);
      toast.success("تم رفع الملف");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل رفع الملف");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="admin-field">
      <label>{label}</label>

      <div className="toggle-tabs" role="tablist" aria-label={label}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "upload"}
          className={mode === "upload" ? "toggle-tab is-active" : "toggle-tab"}
          onClick={() => setMode("upload")}
        >
          رفع ملف
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "url"}
          className={mode === "url" ? "toggle-tab is-active" : "toggle-tab"}
          onClick={() => setMode("url")}
        >
          لصق رابط
        </button>
      </div>

      {mode === "upload" ? (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={uploading}
          className="w-full text-xs text-white/60 file:me-3 file:border-0 file:bg-tiger-cyan file:px-3 file:py-2 file:text-xs file:font-bold file:text-tiger-void"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      ) : (
        <input
          type="url"
          inputMode="url"
          dir="ltr"
          placeholder="https://..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-lg border border-white/10 bg-tiger-panel px-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-tiger-cyan/60"
        />
      )}

      {uploading && <span className="admin-subtle">جارٍ الرفع…</span>}

      {preview && value && !uploading && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="media-preview" />
      )}
    </div>
  );
}
