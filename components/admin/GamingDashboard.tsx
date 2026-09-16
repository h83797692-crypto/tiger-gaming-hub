"use client";

import { useState } from "react";
import { toast } from "sonner";
import type {
  GamingContent,
  Game,
  Match,
  Rarity,
  Round,
  Tournament,
  VideoItem,
} from "@/lib/gaming-content";
import { getYoutubeId, isYoutubeShort } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageField } from "@/components/admin/ImageField";

const RARITIES: Rarity[] = ["common", "rare", "legendary"];

const blankGame = (): Game => ({
  id: crypto.randomUUID(),
  title: "",
  category: "",
  platform: "",
  imageUrl: "",
  iconUrl: "",
  accentColor: "#00f0ff",
  rules: "",
  rarity: "common",
});

const blankMatch = (): Match => ({
  playerA: "",
  playerB: "",
  scoreA: 0,
  scoreB: 0,
  status: "upcoming",
  startTime: "",
});

const blankTournament = (): Tournament => ({
  id: crypto.randomUUID(),
  title: "",
  game: "",
  mode: "solo",
  status: "open",
  date: "",
  prize: "",
  maxPlayers: 16,
  rules: "",
  rounds: [{ name: "الجولة 1", matches: [blankMatch()] }],
});

const blankVideo = (): VideoItem => ({
  id: crypto.randomUUID(),
  title: "",
  url: "",
  youtubeUrl: "",
  thumbnailUrl: "",
  rarity: "common",
});

/** Immutably replace item at `index` using a patch function. */
function replaceAt<T>(list: T[], index: number, patch: (item: T) => T): T[] {
  return list.map((item, i) => (i === index ? patch(item) : item));
}

export function GamingDashboard({ initial, section = "all" }: { initial: GamingContent; section?: "all" | "games" | "tournaments" | "site" }) {
  const [data, setData] = useState<GamingContent>(initial);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof GamingContent>(key: K, value: GamingContent[K]) =>
    setData((current) => ({ ...current, [key]: value }));

  /** Patch one round inside one tournament without flattening the others. */
  const patchRound = (
    tournamentIndex: number,
    roundIndex: number,
    patch: (round: Round) => Round
  ) =>
    update(
      "tournaments",
      replaceAt(data.tournaments, tournamentIndex, (tournament) => ({
        ...tournament,
        rounds: replaceAt(tournament.rounds, roundIndex, patch),
      }))
    );

  const patchMatch = (
    tournamentIndex: number,
    roundIndex: number,
    matchIndex: number,
    patch: (match: Match) => Match
  ) =>
    patchRound(tournamentIndex, roundIndex, (round) => ({
      ...round,
      matches: replaceAt(round.matches, matchIndex, patch),
    }));

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/gaming", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const payload = res.headers.get("content-type")?.includes("application/json")
        ? await res.json().catch(() => ({}))
        : {};

      if (!res.ok) {
        throw new Error(payload.error ?? "تعذر الحفظ");
      }

      if (!payload.success) {
        throw new Error("تعذر تأكيد حفظ التغييرات");
      }

      if (payload.content) {
        setData(payload.content as GamingContent);
      }

      toast.success("تم حفظ إعدادات Tiger Gaming بنجاح ✅");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-stack">
      {(section === "all" || section === "site") && <>
      {/* ---------------------------------------------------------- IDENTITY */}
      <Card>
        <CardHeader>
          <CardTitle>هوية الموقع والنصوص</CardTitle>
        </CardHeader>

        <div className="admin-grid">
          {(["brand", "heroTitle", "heroCta", "announcement", "aboutTitle"] as const).map((key) => (
            <div className="admin-field" key={key}>
              <Label htmlFor={key}>{key}</Label>
              <Input id={key} value={data[key]} onChange={(e) => update(key, e.target.value)} />
            </div>
          ))}
        </div>

        <div className="admin-grid" style={{ marginBlockStart: "0.9rem" }}>
          <div className="admin-field">
            <Label htmlFor="heroSubtitle">وصف الواجهة</Label>
            <Textarea
              id="heroSubtitle"
              value={data.heroSubtitle}
              onChange={(e) => update("heroSubtitle", e.target.value)}
            />
          </div>
          <div className="admin-field">
            <Label htmlFor="aboutBody">النص التعريفي</Label>
            <Textarea
              id="aboutBody"
              value={data.aboutBody}
              onChange={(e) => update("aboutBody", e.target.value)}
            />
          </div>
        </div>
      </Card>

      </>}

      {/* ------------------------------------------------------------- GAMES */}
      {(section === "all" || section === "games" || section === "site") && <>
      <Card>
        <CardHeader>
          <CardTitle>الألعاب والصور</CardTitle>
        </CardHeader>

        <div className="admin-stack">
          {data.games.map((game, index) => (
            <div
              className="admin-row admin-game-row"
              key={game.id}
              style={{
                borderColor: game.accentColor || "rgba(0,240,255,0.35)",
                boxShadow: game.accentColor ? `0 0 24px ${game.accentColor}22` : undefined,
              }}
            >
              <div className="admin-game-preview">
                <div
                  className="admin-game-preview__icon"
                  style={{
                    borderColor: game.accentColor || "#00f0ff",
                    background: `radial-gradient(circle at 30% 30%, ${game.accentColor || "#00f0ff"}66, rgba(10,13,20,0.95) 65%)`,
                  }}
                >
                  {game.iconUrl || game.imageUrl ? (
                    <img src={game.iconUrl || game.imageUrl} alt={game.title || "Game Icon"} />
                  ) : (
                    <span>{(game.title || "G").slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="admin-game-preview__meta">
                  <strong>{game.title || "Game title"}</strong>
                  <span>{game.category || "Category"}</span>
                </div>
              </div>

              <div className="admin-field">
                <Label>اسم اللعبة</Label>
                <Input
                  value={game.title}
                  onChange={(e) =>
                    update("games", replaceAt(data.games, index, (g) => ({ ...g, title: e.target.value })))
                  }
                />
              </div>

              <div className="admin-field">
                <Label>التصنيف</Label>
                <Input
                  value={game.category}
                  onChange={(e) =>
                    update("games", replaceAt(data.games, index, (g) => ({ ...g, category: e.target.value })))
                  }
                />
              </div>

              <div className="admin-field">
                <Label>المنصة</Label>
                <Input
                  value={game.platform}
                  onChange={(e) =>
                    update("games", replaceAt(data.games, index, (g) => ({ ...g, platform: e.target.value })))
                  }
                />
              </div>

              <div className="admin-field">
                <Label>القواعد</Label>
                <Input
                  value={game.rules}
                  onChange={(e) =>
                    update("games", replaceAt(data.games, index, (g) => ({ ...g, rules: e.target.value })))
                  }
                />
              </div>

              <div className="admin-field">
                <Label>الندرة (لون الإطار)</Label>
                <select
                  className="admin-select"
                  value={game.rarity}
                  onChange={(e) =>
                    update(
                      "games",
                      replaceAt(data.games, index, (g) => ({ ...g, rarity: e.target.value as Rarity }))
                    )
                  }
                >
                  {RARITIES.map((rarity) => (
                    <option key={rarity} value={rarity}>
                      {rarity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-field">
                <Label>لون اللعبة (اختياري)</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={game.accentColor || "#00f0ff"}
                    onChange={(e) =>
                      update("games", replaceAt(data.games, index, (g) => ({ ...g, accentColor: e.target.value })))
                    }
                    className="h-10 w-12 rounded border border-white/10 bg-transparent p-0"
                    aria-label="اختر لون اللعبة"
                  />
                  <Input
                    value={game.accentColor || "#00f0ff"}
                    onChange={(e) =>
                      update("games", replaceAt(data.games, index, (g) => ({ ...g, accentColor: e.target.value })))
                    }
                    placeholder="#00f0ff"
                  />
                </div>
              </div>

              <ImageField
                label="صورة اللعبة (غلاف)"
                value={game.imageUrl}
                onChange={(url) =>
                  update("games", replaceAt(data.games, index, (g) => ({ ...g, imageUrl: url })))
                }
              />

              <ImageField
                label="أيقونة اللعبة"
                value={game.iconUrl || game.imageUrl}
                onChange={(url) =>
                  update("games", replaceAt(data.games, index, (g) => ({ ...g, iconUrl: url })))
                }
              />

              <div className="admin-actions">
                <Button
                  variant="ghost"
                  onClick={() =>
                    update("games", data.games.filter((_, i) => i !== index))
                  }
                >
                  حذف اللعبة
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={() => update("games", [...data.games, blankGame()])}>
            + إضافة لعبة
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>البطولات والمواجهات</CardTitle>
        </CardHeader>

        <div className="admin-stack">
          {data.tournaments.map((tournament, tIndex) => (
            <div className="admin-block" key={tournament.id}>
              <div className="admin-grid">
                <div className="admin-field">
                  <Label>اسم البطولة</Label>
                  <Input
                    value={tournament.title}
                    onChange={(e) =>
                      update(
                        "tournaments",
                        replaceAt(data.tournaments, tIndex, (t) => ({ ...t, title: e.target.value }))
                      )
                    }
                  />
                </div>

                <div className="admin-field">
                  <Label>اللعبة</Label>
                  <Input
                    value={tournament.game}
                    onChange={(e) =>
                      update(
                        "tournaments",
                        replaceAt(data.tournaments, tIndex, (t) => ({ ...t, game: e.target.value }))
                      )
                    }
                  />
                </div>

                <div className="admin-field">
                  <Label>نمط البطولة</Label>
                  <select
                    className="admin-select"
                    value={tournament.mode}
                    onChange={(e) =>
                      update(
                        "tournaments",
                        replaceAt(data.tournaments, tIndex, (t) => ({
                          ...t,
                          mode: e.target.value as Tournament["mode"],
                        }))
                      )
                    }
                  >
                    <option value="solo">Solo 1v1</option>
                    <option value="duo">Duo 2v2</option>
                    <option value="squad">Squad 4v4</option>
                  </select>
                </div>

                <div className="admin-field">
                  <Label>الحالة</Label>
                  <select
                    className="admin-select"
                    value={tournament.status}
                    onChange={(e) =>
                      update(
                        "tournaments",
                        replaceAt(data.tournaments, tIndex, (t) => ({
                          ...t,
                          status: e.target.value as Tournament["status"],
                        }))
                      )
                    }
                  >
                    <option value="open">مفتوحة</option>
                    <option value="live">مباشرة</option>
                    <option value="completed">مكتملة</option>
                  </select>
                </div>

                <div className="admin-field">
                  <Label>التاريخ</Label>
                  <Input
                    type="date"
                    value={tournament.date}
                    onChange={(e) =>
                      update(
                        "tournaments",
                        replaceAt(data.tournaments, tIndex, (t) => ({ ...t, date: e.target.value }))
                      )
                    }
                  />
                </div>

                <div className="admin-field">
                  <Label>الجائزة</Label>
                  <Input
                    value={tournament.prize}
                    onChange={(e) =>
                      update(
                        "tournaments",
                        replaceAt(data.tournaments, tIndex, (t) => ({ ...t, prize: e.target.value }))
                      )
                    }
                  />
                </div>

                <div className="admin-field">
                  <Label>الحد الأقصى للاعبين</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={tournament.maxPlayers}
                    onChange={(e) =>
                      update(
                        "tournaments",
                        replaceAt(data.tournaments, tIndex, (t) => ({
                          ...t,
                          maxPlayers: Number(e.target.value) || 0,
                        }))
                      )
                    }
                  />
                </div>

                <div className="admin-field">
                  <Label>القواعد</Label>
                  <Input
                    value={tournament.rules}
                    onChange={(e) =>
                      update(
                        "tournaments",
                        replaceAt(data.tournaments, tIndex, (t) => ({ ...t, rules: e.target.value }))
                      )
                    }
                  />
                </div>
              </div>

              {/* Rounds — each round edited in place, not collapsed into rounds[0]. */}
              {tournament.rounds.map((round, rIndex) => (
                <div className="admin-block" key={`${tournament.id}-round-${rIndex}`}>
                  <div className="admin-field">
                    <Label>اسم الجولة</Label>
                    <Input
                      value={round.name}
                      onChange={(e) =>
                        patchRound(tIndex, rIndex, (r) => ({ ...r, name: e.target.value }))
                      }
                    />
                  </div>

                  {round.matches.map((match, mIndex) => (
                    <div className="admin-row" key={`match-${mIndex}`}>
                      <div className="admin-field">
                        <Label>المتنافس 1</Label>
                        <Input
                          value={match.playerA}
                          onChange={(e) =>
                            patchMatch(tIndex, rIndex, mIndex, (m) => ({
                              ...m,
                              playerA: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="admin-field">
                        <Label>المتنافس 2</Label>
                        <Input
                          value={match.playerB}
                          onChange={(e) =>
                            patchMatch(tIndex, rIndex, mIndex, (m) => ({
                              ...m,
                              playerB: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="admin-field">
                        <Label>النتيجة 1</Label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={match.scoreA}
                          onChange={(e) =>
                            patchMatch(tIndex, rIndex, mIndex, (m) => ({
                              ...m,
                              scoreA: Number(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>

                      <div className="admin-field">
                        <Label>النتيجة 2</Label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={match.scoreB}
                          onChange={(e) =>
                            patchMatch(tIndex, rIndex, mIndex, (m) => ({
                              ...m,
                              scoreB: Number(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>

                      <div className="admin-field">
                        <Label>حالة المواجهة</Label>
                        <select
                          className="admin-select"
                          value={match.status}
                          onChange={(e) =>
                            patchMatch(tIndex, rIndex, mIndex, (m) => ({
                              ...m,
                              status: e.target.value as Match["status"],
                            }))
                          }
                        >
                          <option value="upcoming">قادمة</option>
                          <option value="live">مباشرة</option>
                          <option value="done">منتهية</option>
                        </select>
                      </div>

                      <div className="admin-field">
                        <Label>وقت البدء</Label>
                        <Input
                          type="datetime-local"
                          value={match.startTime}
                          onChange={(e) =>
                            patchMatch(tIndex, rIndex, mIndex, (m) => ({
                              ...m,
                              startTime: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="admin-actions">
                        <Button
                          variant="ghost"
                          onClick={() =>
                            patchRound(tIndex, rIndex, (r) => ({
                              ...r,
                              matches: r.matches.filter((_, i) => i !== mIndex),
                            }))
                          }
                        >
                          حذف المواجهة
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="admin-actions">
                    <Button
                      variant="outline"
                      onClick={() =>
                        patchRound(tIndex, rIndex, (r) => ({
                          ...r,
                          matches: [...r.matches, blankMatch()],
                        }))
                      }
                    >
                      + مواجهة
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        update(
                          "tournaments",
                          replaceAt(data.tournaments, tIndex, (t) => ({
                            ...t,
                            rounds: t.rounds.filter((_, i) => i !== rIndex),
                          }))
                        )
                      }
                    >
                      حذف الجولة
                    </Button>
                  </div>
                </div>
              ))}

              <div className="admin-actions">
                <Button
                  variant="outline"
                  onClick={() =>
                    update(
                      "tournaments",
                      replaceAt(data.tournaments, tIndex, (t) => ({
                        ...t,
                        rounds: [
                          ...t.rounds,
                          { name: `الجولة ${t.rounds.length + 1}`, matches: [blankMatch()] },
                        ],
                      }))
                    )
                  }
                >
                  + جولة
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    update("tournaments", data.tournaments.filter((_, i) => i !== tIndex))
                  }
                >
                  حذف البطولة
                </Button>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={() => update("tournaments", [...data.tournaments, blankTournament()])}
          >
            + بطولة جديدة
          </Button>
        </div>
      </Card>

      </>}

      {/* ------------------------------------------------------------ VIDEOS */}
      {(section === "all" || section === "site") && <>
      <Card>
        <CardHeader>
          <CardTitle>مركز الفيديو و YouTube Shorts</CardTitle>
        </CardHeader>

        <div className="admin-stack">
          {data.videos.map((video, index) => {
            const parsedId = getYoutubeId(video.youtubeUrl);
            return (
              <div className="admin-row" key={video.id}>
                <div className="admin-field">
                  <Label>العنوان</Label>
                  <Input
                    value={video.title}
                    onChange={(e) =>
                      update("videos", replaceAt(data.videos, index, (v) => ({ ...v, title: e.target.value })))
                    }
                  />
                </div>

                <div className="admin-field">
                  <Label>رابط YouTube أو Shorts</Label>
                  <Input
                    dir="ltr"
                    inputMode="url"
                    placeholder="https://youtube.com/shorts/..."
                    value={video.youtubeUrl}
                    onChange={(e) =>
                      update(
                        "videos",
                        replaceAt(data.videos, index, (v) => ({
                          ...v,
                          youtubeUrl: e.target.value,
                          // Derived here for instant feedback; the API re-derives on save.
                          youtubeId: getYoutubeId(e.target.value) ?? undefined,
                        }))
                      )
                    }
                  />
                  <span className="admin-subtle">
                    {parsedId
                      ? `✅ ${isYoutubeShort(video.youtubeUrl) ? "Short" : "Video"} · ${parsedId}`
                      : video.url.startsWith("/uploads/")
                        ? "ملف مرفوع"
                        : "الصق رابط YouTube صالحًا"}
                  </span>
                </div>

                <div className="admin-field">
                  <Label>الندرة (لون الإطار)</Label>
                  <select
                    className="admin-select"
                    value={video.rarity}
                    onChange={(e) =>
                      update(
                        "videos",
                        replaceAt(data.videos, index, (v) => ({ ...v, rarity: e.target.value as Rarity }))
                      )
                    }
                  >
                    {RARITIES.map((rarity) => (
                      <option key={rarity} value={rarity}>
                        {rarity}
                      </option>
                    ))}
                  </select>
                </div>

                <ImageField
                  label="أو ارفع ملف فيديو"
                  accept="video/mp4"
                  preview={false}
                  value={video.url}
                  onChange={(url) =>
                    update("videos", replaceAt(data.videos, index, (v) => ({ ...v, url })))
                  }
                />

                <div className="admin-actions">
                  <Button
                    variant="ghost"
                    onClick={() => update("videos", data.videos.filter((_, i) => i !== index))}
                  >
                    حذف الفيديو
                  </Button>
                </div>
              </div>
            );
          })}

          <Button variant="outline" onClick={() => update("videos", [...data.videos, blankVideo()])}>
            + إضافة فيديو
          </Button>
        </div>
      </Card>

      </>}

      {section !== "all" && <Button size="lg" onClick={save} disabled={saving}>
        {saving ? "جارٍ الحفظ…" : "حفظ كل التعديلات"}
      </Button>}
    </div>
  );
}
