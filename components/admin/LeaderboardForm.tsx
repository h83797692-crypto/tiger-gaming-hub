"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Leaderboard } from "@/lib/leaderboard-content";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageField } from "@/components/admin/ImageField";

const LADDER_LEVELS = 5;

function replaceAt<T>(list: T[], index: number, patch: (item: T) => T): T[] {
  return list.map((item, i) => (i === index ? patch(item) : item));
}

export function LeaderboardForm({ initial }: { initial: Leaderboard }) {
  const [data, setData] = useState<Leaderboard>({ ...initial, entries: [...initial.entries].sort((a, b) => b.points - a.points) });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/leaderboards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "تعذر حفظ السلم");
      }
      toast.success("تم تحديث Battle Pass");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Battle Pass Ladder — {LADDER_LEVELS} مستويات</CardTitle>
      </CardHeader>

      <div className="admin-stack">
        <div className="admin-grid">
          <div className="admin-field">
            <Label>عنوان السلم</Label>
            <Input
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
            />
          </div>
          <div className="admin-field">
            <Label>اللعبة</Label>
            <Input value={data.game} onChange={(e) => setData({ ...data, game: e.target.value })} />
          </div>
        </div>

        {/* The ladder is fixed at five levels — tiers are edited, never added. */}
        <div className="admin-block">
          <h4>المستويات الخمسة</h4>
          {data.tiers.map((tier, index) => (
            <div className="admin-row" key={tier.tier}>
              <div className="admin-field">
                <Label>المستوى {tier.tier} — الاسم</Label>
                <Input
                  value={tier.label}
                  onChange={(e) =>
                    setData({
                      ...data,
                      tiers: replaceAt(data.tiers, index, (t) => ({ ...t, label: e.target.value })),
                    })
                  }
                />
              </div>

              <div className="admin-field">
                <Label>النقاط المطلوبة (XP)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={tier.threshold}
                  onChange={(e) =>
                    setData({
                      ...data,
                      tiers: replaceAt(data.tiers, index, (t) => ({
                        ...t,
                        threshold: Number(e.target.value) || 0,
                      })),
                    })
                  }
                />
              </div>

              <ImageField
                label="أيقونة المستوى"
                value={tier.iconUrl}
                onChange={(url) =>
                  setData({
                    ...data,
                    tiers: replaceAt(data.tiers, index, (t) => ({ ...t, iconUrl: url })),
                  })
                }
              />
            </div>
          ))}
        </div>

        <div className="admin-block">
          <h4>اللاعبون</h4>
          {data.entries.map((entry, index) => (
            <div className="admin-row" key={`${entry.name}-${index}`}>
              <div className="admin-field">
                <Label>اسم اللاعب</Label>
                <Input
                  value={entry.name}
                  onChange={(e) =>
                    setData({
                      ...data,
                      entries: replaceAt(data.entries, index, (item) => ({
                        ...item,
                        name: e.target.value,
                      })),
                    })
                  }
                />
              </div>

              <div className="admin-field">
                <Label>النقاط</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={entry.points}
                  onChange={(e) =>
                    setData({
                      ...data,
                      entries: replaceAt(data.entries, index, (item) => ({
                        ...item,
                        points: Number(e.target.value) || 0,
                      })),
                    })
                  }
                />
              </div>

              <ImageField
                label="صورة اللاعب"
                value={entry.avatarUrl}
                onChange={(url) =>
                  setData({
                    ...data,
                    entries: replaceAt(data.entries, index, (item) => ({ ...item, avatarUrl: url })),
                  })
                }
              />

              <div className="admin-actions">
                <Button
                  variant="ghost"
                  onClick={() =>
                    setData({ ...data, entries: data.entries.filter((_, i) => i !== index) })
                  }
                >
                  حذف
                </Button>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={() =>
              setData({ ...data, entries: [...data.entries, { name: "", avatarUrl: "", points: 0 }] })
            }
          >
            + لاعب
          </Button>
        </div>

        <Button onClick={save} disabled={saving}>
          {saving ? "جارٍ الحفظ…" : "حفظ Battle Pass"}
        </Button>
      </div>
    </Card>
  );
}
