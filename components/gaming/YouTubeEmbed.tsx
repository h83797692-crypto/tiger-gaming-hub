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
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YoutubePlayer | null>(null);
  const readyRef = useRef(false);
  const watchSessionRef = useRef<string | null>(null);
  const sessionStartingRef = useRef<Promise<boolean> | null>(null);
  const lastHeartbeatRef = useRef(0);
  const [notice, setNotice] = useState("");
  const [origin, setOrigin] = useState("");
  const [shouldLoad, setShouldLoad] = useState(false);
  const [watchXp, setWatchXp] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!videoId || shouldLoad || !containerRef.current) return;
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
  }, [videoId, shouldLoad]);

  useEffect(() => {
    if (!videoId || !origin || !shouldLoad || !hostRef.current) return;
    let active = true;
    let timer: number | undefined;
    setWatchXp(0);
    setIsPlaying(false);
    const heartbeatInFlightRef = { current: false };
    const watchBlockedRef = { current: false };
    const send = async (action: "start" | "heartbeat" | "stop", player: YoutubePlayer) => {
      const visible = document.visibilityState === "visible";
      const currentTime = Math.max(0, player.getCurrentTime());
      if (status !== "authenticated" || session?.user?.provider !== "google") return;
      if (action === "heartbeat" && (watchBlockedRef.current || heartbeatInFlightRef.current)) return;
      if (action !== "start" && !watchSessionRef.current) {
        if (sessionStartingRef.current) await sessionStartingRef.current;
        if (!watchSessionRef.current) return;
      }
      if (action === "heartbeat") heartbeatInFlightRef.current = true;
      try {
        const response = await fetch("/api/youtube/watch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, videoId, sessionId: watchSessionRef.current ?? undefined, currentTime, playing: player.getPlayerState() === 1, visible }) });
        const payload = await response.json().catch(() => ({}));
        if (payload.sessionId) watchSessionRef.current = payload.sessionId;
        if (active && action === "heartbeat" && Number.isFinite(Number(payload.earnedXp))) {
          setWatchXp(Math.max(0, Number(payload.earnedXp)));
        }
        if (action === "heartbeat" && Number(payload.addedXp ?? 0) > 0) {
          window.dispatchEvent(new CustomEvent("tiger:xp-awarded", { detail: { amount: Number(payload.addedXp) } }));
        }
        if (action === "heartbeat" && (response.status === 409 || payload.alreadyClaimed === true)) {
          watchBlockedRef.current = true;
          if (timer) window.clearInterval(timer);
        }
        if (!response.ok && action !== "stop") setNotice(payload.error ?? "تم إيقاف احتساب المشاهدة");
        return response.ok;
      } finally {
        if (action === "heartbeat") heartbeatInFlightRef.current = false;
      }
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
          widget_referrer: window.location.href,
        },
        events: {
          onReady: () => {
            readyRef.current = true;
            playerRef.current = player;
            sessionStartingRef.current = (async () => {
              const refreshedSession = await update();
              if (refreshedSession?.user?.provider !== "google") return false;
              return send("start", player);
            })().finally(() => { sessionStartingRef.current = null; }).then(() => Boolean(watchSessionRef.current));
          },
          onStateChange: (event) => { setIsPlaying(event.data === 1); },
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
      timer = window.setInterval(() => { if (readyRef.current && playerRef.current && watchSessionRef.current && Date.now() - lastHeartbeatRef.current > 3500) { lastHeartbeatRef.current = Date.now(); void send("heartbeat", playerRef.current); } }, 4000);
    }).catch(() => setNotice("تعذر تشغيل مشغل YouTube"));
    const visibility = () => { if (readyRef.current && playerRef.current && watchSessionRef.current) void send("heartbeat", playerRef.current); };
    document.addEventListener("visibilitychange", visibility);
    return () => { active = false; document.removeEventListener("visibilitychange", visibility); if (timer) window.clearInterval(timer); if (readyRef.current && playerRef.current) void send("stop", playerRef.current); readyRef.current = false; playerRef.current?.destroy(); playerRef.current = null; };
  }, [videoId, session?.user?.provider, status, origin, shouldLoad, update]);

  if (videoId && origin) {
    const embedParams = new URLSearchParams({
      enablejsapi: "1",
      modestbranding: "1",
      origin,
      playsinline: "1",
      rel: "0",
      widget_referrer: window.location.href,
    });

    return (
      <div ref={containerRef} className="video-frame youtube-player-frame">
        {shouldLoad && <iframe
            ref={hostRef}
            title={title}
            src={`https://www.youtube.com/embed/${videoId}?${embedParams.toString()}`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />}
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
