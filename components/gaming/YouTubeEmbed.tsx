"use client";

import { useEffect, useRef, useState } from "react";
import { getYoutubeId } from "@/lib/youtube";
import { useSession } from "next-auth/react";
import { AnimatedXP } from "@/components/gaming/AnimatedXP";

type YoutubePlayer = { getCurrentTime: () => number; getPlayerState: () => number; destroy: () => void };
type YoutubeNamespace = { Player: new (element: HTMLElement, options: { videoId: string; playerVars: Record<string, string | number>; events: { onReady: () => void; onStateChange: (event: { data: number }) => void; onError: (event: { data: number }) => void } }) => YoutubePlayer };

declare global { interface Window { YT?: YoutubeNamespace; onYouTubeIframeAPIReady?: () => void } }

let apiPromise: Promise<YoutubeNamespace> | null = null;
function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise<YoutubeNamespace>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); if (window.YT) resolve(window.YT); else reject(new Error("YouTube API unavailable")); };
    if (!existing) { const script = document.createElement("script"); script.src = "https://www.youtube.com/iframe_api"; script.async = true; script.onerror = () => reject(new Error("YouTube API failed")); document.head.appendChild(script); }
  });
  return apiPromise;
}

/**
 * Responsive 16:9 embed driven by the parsed video ID.
 * Falls back to a locally uploaded file, then to a prompt for the admin.
 */
export function YouTubeEmbed({
  youtubeUrl,
  fallbackUrl,
  title,
}: {
  youtubeUrl: string;
  fallbackUrl?: string;
  title: string;
}) {
  const videoId = getYoutubeId(youtubeUrl);
  const { data: session, status, update } = useSession();
  const authRef = useRef({ provider: session?.user?.provider, status });
  const updateRef = useRef(update);
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YoutubePlayer | null>(null);
  const readyRef = useRef(false);
  const watchSessionRef = useRef<string | null>(null);
  const sessionStartingRef = useRef<Promise<boolean> | null>(null);
  const lastHeartbeatRef = useRef(0);
  const [notice, setNotice] = useState("");
  const [origin, setOrigin] = useState("");
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [watchXp, setWatchXp] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  authRef.current = { provider: session?.user?.provider, status };
  updateRef.current = update;

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!videoId || shouldLoad || isActivated || !containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [videoId, shouldLoad, isActivated]);

  useEffect(() => {
    if (!videoId || !origin || !shouldLoad || !isActivated || !hostRef.current) return;
    let active = true;
    let heartbeatTimer: number | undefined;
    setWatchXp(0);
    setIsPlaying(false);
    const heartbeatInFlightRef = { current: false };
    const watchBlockedRef = { current: false };
    const send = async (action: "start" | "heartbeat" | "stop", player: YoutubePlayer) => {
      const visible = document.visibilityState === "visible";
      const currentTime = Math.max(0, player.getCurrentTime());
      if (authRef.current.status !== "authenticated" || authRef.current.provider !== "google") return;
      if (action === "heartbeat" && (watchBlockedRef.current || heartbeatInFlightRef.current)) return;
      if (action !== "start" && !watchSessionRef.current) {
        if (sessionStartingRef.current) await sessionStartingRef.current;
        if (!watchSessionRef.current) return;
      }
      if (action === "heartbeat") heartbeatInFlightRef.current = true;
      try {
        const response = await fetch("/api/youtube/watch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, videoId, sessionId: watchSessionRef.current ?? undefined, currentTime, playing: player.getPlayerState() === 1, visible }) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          console.error("[YouTube XP] Watch API request failed", {
            action,
            status: response.status,
            error: payload.error,
          });
          if (action !== "stop") setNotice(payload.error ?? "تعذر احتساب XP للمشاهدة");
          return false;
        }
        if (payload.sessionId) watchSessionRef.current = payload.sessionId;
        if (active && action === "heartbeat" && Number.isFinite(Number(payload.earnedXp))) {
          setWatchXp(Math.max(0, Number(payload.earnedXp)));
        }
        if (action === "heartbeat") {
          window.dispatchEvent(new CustomEvent("tiger:xp-awarded", {
            detail: {
              amount: Number(payload.addedXp ?? 0),
              earnedXp: Number(payload.earnedXp ?? 0),
            },
          }));
        }
        if (action === "heartbeat" && (response.status === 409 || payload.alreadyClaimed === true)) {
          watchBlockedRef.current = true;
          stopHeartbeat();
        }
        return response.ok;
      } catch (error) {
        console.error("[YouTube XP] Watch API connection failed", { action, error });
        if (action !== "stop") setNotice("تعذر الاتصال بخدمة احتساب XP");
        return false;
      } finally {
        if (action === "heartbeat") heartbeatInFlightRef.current = false;
      }
    };
    const startWatchSession = (player: YoutubePlayer) => {
      if (watchSessionRef.current) return Promise.resolve(true);
      if (sessionStartingRef.current) return sessionStartingRef.current;
      sessionStartingRef.current = (async () => {
        const refreshedSession = await updateRef.current();
        if (refreshedSession?.user?.provider !== "google") return false;
        return send("start", player);
      })().finally(() => { sessionStartingRef.current = null; }).then(() => Boolean(watchSessionRef.current));
      return sessionStartingRef.current;
    };
    const stopHeartbeat = () => {
      if (heartbeatTimer) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = undefined;
      }
    };
    const startHeartbeat = (player: YoutubePlayer) => {
      if (heartbeatTimer) return;
      heartbeatTimer = window.setInterval(() => {
        if (readyRef.current && playerRef.current && watchSessionRef.current && player.getPlayerState() === 1 && Date.now() - lastHeartbeatRef.current > 3500) {
          lastHeartbeatRef.current = Date.now();
          void send("heartbeat", player);
        }
      }, 4000);
    };
    void loadYoutubeApi().then((YT) => {
      if (!active || !hostRef.current) return;
      const player = new YT.Player(hostRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin,
        },
        events: {
          onReady: () => {
            readyRef.current = true;
            playerRef.current = player;
          },
          onStateChange: (event) => {
            setIsPlaying(event.data === 1);
            if (event.data === 1) {
              void startWatchSession(player)
                .then(() => {
                  startHeartbeat(player);
                  return send("heartbeat", player);
                })
                .catch(() => setNotice("تعذر بدء جلسة احتساب XP"));
            } else {
              stopHeartbeat();
            }
          },
          onError: (event) => {
            readyRef.current = false;
            const message = event.data === 101 || event.data === 150
              ? "هذا الفيديو لا يسمح بالتضمين الخارجي. افتحه مباشرة على YouTube."
              : "تعذر تشغيل هذا الفيديو؛ تحقق من رابط YouTube.";
            setNotice(message);
          },
        },
      });
      playerRef.current = player;
    }).catch(() => setNotice("تعذر تشغيل مشغل YouTube"));
    const visibility = () => { if (readyRef.current && playerRef.current && watchSessionRef.current) void send("heartbeat", playerRef.current); };
    document.addEventListener("visibilitychange", visibility);
    return () => { active = false; document.removeEventListener("visibilitychange", visibility); stopHeartbeat(); if (readyRef.current && playerRef.current) void send("stop", playerRef.current); readyRef.current = false; playerRef.current?.destroy(); playerRef.current = null; };
  }, [videoId, origin, shouldLoad, isActivated]);

  function activatePlayer() {
    setIsActivated(true);
    setShouldLoad(true);
  }

  if (videoId && origin) {
    return (
      <div ref={containerRef} className="video-frame youtube-player-frame">
        {!isActivated && <>
          <img
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt={title}
            loading="lazy"
            className="video-frame"
          />
          <button type="button" className="youtube-watch-notice" onClick={activatePlayer} aria-label={`تشغيل ${title}`}>
            تشغيل الفيديو
          </button>
        </>}
        {isActivated && shouldLoad && <div ref={hostRef} title={title} />}
        {status === "authenticated" && session?.user?.provider === "google" && (isPlaying || watchXp > 0) && <AnimatedXP value={watchXp} className="youtube-watch-notice" />}
        {notice && <small className="youtube-watch-notice">{notice}</small>}
      </div>
    );
  }

  if (fallbackUrl && fallbackUrl.startsWith("/uploads/")) {
    return (
      <div className="video-frame">
        <video src={fallbackUrl} controls preload="metadata" />
      </div>
    );
  }

  return <div className="video-frame video-frame--empty">أضف رابط YouTube من لوحة التحكم</div>;
}
