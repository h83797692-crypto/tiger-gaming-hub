"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CornerUpLeft, LogIn, Send, Wifi, X } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { UserAvatar } from "@/components/UserAvatar";
import type { CommunityRole } from "@/lib/roles";

type ChatMessage = {
  id: string;
  text: string;
  replyTo: { id: string; name: string; text: string } | null;
  mentions: string[];
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string;
    frame: "champion" | null;
    frameEnabled: boolean;
    badge: string;
    xp: number;
    roles: CommunityRole[];
    role: string;
    roleLabel: string;
    roleColor: string;
    online: boolean;
  };
};

type ChatUser = { id: string; name: string; avatarUrl: string; roleLabel: string; roleColor: string; online: boolean };

export function LiveChatRoom({ roomId }: { roomId: string }) {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage["replyTo"]>(null);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = roomRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(Boolean(entry?.isIntersecting)), { rootMargin: "240px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const source = new EventSource(`/api/chat?roomId=${encodeURIComponent(roomId)}`);
    const handleMessages = (event: MessageEvent<string>) => {
      try {
        setMessages(JSON.parse(event.data) as ChatMessage[]);
        setError(null);
      } catch {
        setError("تعذر قراءة رسائل الشات");
      }
    };
    source.addEventListener("chat", handleMessages);
    source.addEventListener("error", () => setError("الاتصال بالشات غير مستقر، جارٍ إعادة المحاولة..."));
    return () => source.close();
  }, [isVisible, roomId]);

  useEffect(() => {
    if (!isVisible || status !== "authenticated") return;
    const heartbeat = () => void fetch("/api/chat/presence", { method: "POST" });
    const loadUsers = () => void fetch("/api/chat/users", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((payload) => setChatUsers(payload?.users ?? []));
    heartbeat();
    loadUsers();
    const timer = window.setInterval(() => { heartbeat(); loadUsers(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [isVisible, status]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanText = text.trim();
    if (!cleanText || sending) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, text: cleanText, replyTo: replyTo?.id ?? null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "تعذر إرسال الرسالة");
      setText("");
      setReplyTo(null);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "تعذر إرسال الرسالة");
    } finally {
      setSending(false);
    }
  }

  const mentionMatch = text.match(/(?:^|\s)@([\p{L}\p{N}_-]*)$/u);
  const mentionSuggestions = mentionMatch ? chatUsers.filter((user) => user.name.toLowerCase().includes(mentionMatch[1].toLowerCase())).slice(0, 6) : [];
  function selectMention(user: ChatUser) {
    if (!mentionMatch) return;
    setText(text.replace(/@([\p{L}\p{N}_-]*)$/u, `@${user.name.replace(/\s+/g, "_")} `));
  }

  return (
    <section ref={roomRef} className="live-chat" dir="rtl" aria-label="غرفة الشات المباشر">
      <header className="live-chat__header">
        <div>
          <p className="eyebrow">LIVE ROOM / CHAT</p>
          <h3>غرفة البث</h3>
        </div>
        <span className="live-chat__online"><Wifi size={14} /> LIVE</span>
      </header>

      <div className="live-chat__messages" ref={listRef} aria-live="polite">
        {messages.length === 0 ? (
          <p className="live-chat__empty">كن أول من يحيّي اللاعبين في الغرفة.</p>
        ) : messages.map((message) => (
          <article className="live-chat__message" key={message.id}>
            <UserAvatar size="sm" name={message.user.name} avatarUrl={message.user.avatarUrl} profile={message.user} />
            <div className="live-chat__message-copy">
              {message.replyTo && <small className="live-chat__reply-preview">ردًا على {message.replyTo.name}: {message.replyTo.text}</small>}
              <div className="live-chat__message-meta">
                <strong>{message.user.name}</strong>
                <span style={{ color: message.user.roleColor }}>{message.user.roleLabel}</span>
                <i className={`live-chat__presence-dot${message.user.online ? " is-online" : ""}`} title={message.user.online ? "متصل" : "غير متصل"} />
                <small>{message.user.xp.toLocaleString("en")} XP</small>
              </div>
              <p>{message.text.split(/(@[\p{L}\p{N}_-]+)/gu).map((part, index) => part.startsWith("@") ? <mark key={index}>{part}</mark> : part)}</p>
              {status === "authenticated" && <button type="button" className="live-chat__reply-button" onClick={() => setReplyTo({ id: message.id, name: message.user.name, text: message.text })}><CornerUpLeft size={13} /> رد</button>}
            </div>
          </article>
        ))}
      </div>

      {error && <p className="live-chat__error">{error}</p>}

      {status === "authenticated" ? (
        <form className="live-chat__composer" onSubmit={sendMessage}>
          <UserAvatar size="sm" name={session.user?.name ?? "Tiger Player"} avatarUrl={session.user?.image ?? ""} profile={session.user?.profile} />
          <div className="live-chat__composer-field">
            {replyTo && <div className="live-chat__replying">رد على {replyTo.name}<button type="button" onClick={() => setReplyTo(null)} aria-label="إلغاء الرد"><X size={13} /></button></div>}
            <input value={text} maxLength={500} onChange={(event) => setText(event.target.value)} placeholder="اكتب رسالة أو استخدم @ لذكر لاعب..." aria-label="رسالة الشات" />
            {mentionSuggestions.length > 0 && <div className="live-chat__mention-menu">{mentionSuggestions.map((user) => <button type="button" key={user.id} onClick={() => selectMention(user)}><span className="live-chat__presence-dot is-online" /><strong>{user.name}</strong><small style={{ color: user.roleColor }}>{user.roleLabel}</small></button>)}</div>}
          </div>
          <button type="submit" disabled={sending || !text.trim()} aria-label="إرسال الرسالة" title="إرسال الرسالة"><Send size={17} /></button>
        </form>
      ) : (
        <button type="button" className="live-chat__login" onClick={() => signIn("google", { callbackUrl: window.location.href })}>
          <LogIn size={16} /> سجّل الدخول للمشاركة
        </button>
      )}
    </section>
  );
}
