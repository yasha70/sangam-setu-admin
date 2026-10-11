"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { startCall } from "./CallManager";
import { Icon, Silhouette } from "./Icon";
import { send, toast } from "./Toaster";
import { hasContact, maskContacts } from "@/lib/privacy";
import { MEET_MODES, REACTIONS, type CallOutcome, type ChatMeta, type MeetMode, type MeetStatus, type Message } from "@/lib/types";

type Msg = Message & { pending?: boolean; localUrl?: string };
type Other = { id: string; name: string; photo: string | null; line: string };

const MODE_ICON: Record<MeetMode, string> = { "Video call": "video", "Phone call": "phone", "Coffee meet": "coffee", "Family visit": "family" };
const EMOJIS = ["🙏", "😊", "😄", "😂", "🥰", "😍", "😇", "🤗", "🤔", "😅", "👍", "👌", "🙌", "👏", "❤️", "💕", "🌸", "🌺", "✨", "🎉", "☕", "🍬", "🪔", "🌙"];
const QUICK = ["Namaste 🙏", "Ji haan 😊", "Thank you so much!", "Let me ask my family and come back to you.", "Can we talk on a call this weekend?", "Good night 🌙"];
const MONEY = /\b(upi|paytm|phonepe|gpay|google pay|bank account|account number|ifsc|otp|send money|transfer money|need money|loan|gift card|bitcoin|crypto|western union|customs fee|courier fee)\b/i;
const URL_RE = /(https?:\/\/[^\s]+)/g;

function dayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date(new Date().toDateString()).getTime();
  const day = new Date(d.toDateString()).getTime();
  if (day === today) return "Today";
  if (today - day === 86400000) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

const clock = (ts: number) => new Date(ts).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function calendarLink(m: NonNullable<Message["meet"]>, other: string) {
  const start = new Date(m.when);
  const end = new Date(start.getTime() + 60 * 60_000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({ action: "TEMPLATE", text: `${m.mode} with ${other} · Sangam Setu`, dates: `${f(start)}/${f(end)}`, details: "Planned on Sangam Setu.", location: m.place ?? "" });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow">
            {p}
          </a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/** Shrinks a photo before upload so chats stay quick on mobile data. */
async function compress(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const img = await createImageBitmap(file).catch(() => null);
  if (!img) return file;
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.82));
}

function VoicePlayer({ url, dur, mine }: { url: string; dur?: number; mine: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const total = dur || 0;
  return (
    <span className={`voice${mine ? " mine" : ""}`}>
      <button
        type="button"
        className="voice-play"
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        onClick={() => {
          const a = audio.current;
          if (!a) return;
          if (a.paused) a.play().catch(() => toast("Couldn't play this voice note.", true));
          else a.pause();
        }}
      >
        {playing ? <span className="pause-bars" aria-hidden="true"><i /><i /></span> : <span className="play-tri" aria-hidden="true" />}
      </button>
      <span
        className="voice-track"
        role="slider"
        aria-label="Position"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.round(pos)}
        tabIndex={0}
        onClick={(e) => {
          const a = audio.current;
          if (!a || !total) return;
          const r = e.currentTarget.getBoundingClientRect();
          a.currentTime = ((e.clientX - r.left) / r.width) * total;
        }}
      >
        {Array.from({ length: 28 }, (_, i) => (
          <i key={i} style={{ height: `${30 + ((i * 37) % 70)}%` }} data-on={total && i / 28 < pos / total ? "true" : undefined} />
        ))}
      </span>
      <small>{mmss(playing || pos ? pos : total)}</small>
      <audio
        ref={audio}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setPos(0);
        }}
        onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
      />
    </span>
  );
}

function MeetCard({ m, mine, status, other, onRespond }: { m: Message; mine: boolean; status: MeetStatus; other: string; onRespond: (accept: boolean) => void }) {
  const meet = m.meet!;
  const past = new Date(meet.when).getTime() < Date.now();
  return (
    <div className={`meet-card ${mine ? "out" : "in"}`} data-status={status}>
      <span className="meet-ico"><Icon name={MODE_ICON[meet.mode] ?? "calendar"} /></span>
      <div className="meet-info">
        <small>{mine ? "You proposed" : `${other} proposed`}</small>
        <b>{meet.mode}</b>
        <span>{fmtWhen(meet.when)}{meet.place ? ` · ${meet.place}` : ""}</span>
      </div>
      <div className="meet-act">
        {status === "accepted" ? (
          <>
            <span className="pill ok"><Icon name="check" />Confirmed</span>
            {!past ? <a className="btn btn-quiet btn-sm" href={calendarLink(meet, other)} target="_blank" rel="noreferrer">Add to calendar</a> : null}
          </>
        ) : status === "declined" ? (
          <span className="pill">Not this time</span>
        ) : mine ? (
          <span className="pill gold">Waiting for {other}</span>
        ) : past ? (
          <span className="pill">Time has passed</span>
        ) : (
          <>
            <button className="btn btn-brand btn-sm" onClick={() => onRespond(true)}>Accept</button>
            <button className="btn btn-ghost btn-sm" onClick={() => onRespond(false)}>Can&apos;t make it</button>
          </>
        )}
      </div>
    </div>
  );
}

function CallCard({ m, mine, outcome, other, onCall }: { m: Message; mine: boolean; outcome?: CallOutcome; other: string; onCall: (video: boolean) => void }) {
  const video = Boolean(m.call?.video);
  const st = outcome?.status ?? "ended";
  const missed = st === "missed" || st === "cancelled";
  const label =
    st === "ringing" ? (mine ? "Calling…" : "Incoming call") :
    st === "active" ? "On call now" :
    st === "declined" ? (mine ? `${other} was busy` : "You declined") :
    missed ? (mine ? "No answer" : "Missed call") :
    outcome?.dur ? mmss(outcome.dur) : "Call ended";
  return (
    <div className={`call-card ${mine ? "out" : "in"}${missed && !mine ? " missed" : ""}`}>
      <span className="call-ico"><Icon name={video ? "video" : "phone"} /></span>
      <span className="call-info">
        <b>{video ? "Video call" : "Voice call"}</b>
        <small>{label} · {clock(m.ts)}</small>
      </span>
      {st !== "ringing" && st !== "active" ? (
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => onCall(video)}>
          {mine ? "Call again" : "Call back"}
        </button>
      ) : null}
    </div>
  );
}

export function Conversation({
  me,
  other,
  initial,
  initialRead,
  initialMeets = {},
  initialMeta = { rx: {}, del: [] },
  initialCalls = {},
  starters = [],
}: {
  me: string;
  other: Other;
  initial: Message[];
  initialRead: number;
  initialMeets?: Record<string, MeetStatus>;
  initialMeta?: ChatMeta;
  initialCalls?: Record<string, CallOutcome>;
  starters?: string[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [theirRead, setTheirRead] = useState(initialRead);
  const [text, setText] = useState("");
  const [online, setOnline] = useState(true);
  const [typing, setTyping] = useState(false);
  const [meets, setMeets] = useState(initialMeets);
  const [meta, setMeta] = useState<ChatMeta>(initialMeta);
  const [calls, setCalls] = useState(initialCalls);
  const [panel, setPanel] = useState<null | "emoji" | "plan">(null);
  const [menu, setMenu] = useState(false);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [rec, setRec] = useState<{ start: number; secs: number } | null>(null);
  const [unseen, setUnseen] = useState(0);
  const [confirmBlock, setConfirmBlock] = useState(false);

  const body = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const stick = useRef(true);
  const lastTs = useRef(initial.length ? initial[initial.length - 1].ts : 0);
  const lastActivity = useRef(Date.now());
  const lastTypingPing = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recCancel = useRef(false);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = other.name.split(" ")[0];
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  const merge = useCallback(
    (incoming: Message[]) => {
      if (!incoming.length) return;
      lastActivity.current = Date.now();
      setMessages((cur) => {
        const ids = new Set(cur.map((m) => m.id));
        const add = incoming.filter((m) => !ids.has(m.id));
        if (!add.length) return cur;
        if (!stick.current) setUnseen((n) => n + add.filter((m) => m.from !== me).length);
        return [...cur.filter((m) => !m.pending || !add.some((a) => a.from === me && a.text === m.text && a.kind === m.kind)), ...add].sort((a, b) => a.ts - b.ts);
      });
      lastTs.current = Math.max(lastTs.current, ...incoming.map((m) => m.ts));
    },
    [me],
  );

  // Live updates: poll quickly while the conversation is active, more slowly when it's quiet.
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!document.hidden) {
        try {
          const res = await fetch(`/api/chat/${other.id}?after=${lastTs.current}`, { cache: "no-store" });
          if (res.ok) {
            const data = (await res.json()) as {
              messages: Message[];
              theirRead: number;
              typing: boolean;
              meets: Record<string, MeetStatus>;
              meta: ChatMeta;
              calls: Record<string, CallOutcome>;
            };
            if (!stop) {
              merge(data.messages);
              setTheirRead(data.theirRead);
              setTyping(data.typing);
              setMeets(data.meets);
              setMeta(data.meta);
              setCalls(data.calls);
              if (data.typing) lastActivity.current = Date.now();
              setOnline(true);
            }
          } else if (res.status === 403) {
            stop = true;
            toast("This chat is no longer available.", true);
          }
        } catch {
          setOnline(false);
        }
      }
      const quiet = Date.now() - lastActivity.current > 60_000;
      if (!stop) timer = setTimeout(tick, quiet ? 4000 : 1500);
    };
    timer = setTimeout(tick, 1500);
    const wake = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", wake);
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [other.id, merge]);

  useLayoutEffect(() => {
    const el = body.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const onScroll = () => {
    const el = body.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (stick.current) setUnseen(0);
    setActive(null);
  };
  const toBottom = () => {
    const el = body.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    stick.current = true;
    setUnseen(0);
  };

  const pingTyping = () => {
    const now = Date.now();
    if (now - lastTypingPing.current < 3000) return;
    lastTypingPing.current = now;
    fetch(`/api/chat/${other.id}/typing`, { method: "POST" }).catch(() => {});
  };

  async function submit(preset?: string) {
    const t = (preset ?? text).trim();
    if (!t) return;
    const reply = replyTo ? { id: replyTo.id, from: replyTo.from, text: replyTo.text || (replyTo.kind === "image" ? "📷 Photo" : replyTo.kind === "voice" ? "🎤 Voice note" : "") } : undefined;
    const temp: Msg = { id: `tmp-${Date.now()}`, from: me, text: maskContacts(t).text, ts: Date.now(), pending: true, reply };
    stick.current = true;
    setMessages((cur) => [...cur, temp]);
    if (!preset) setText("");
    setReplyTo(null);
    setPanel(null);
    box.current?.focus();
    try {
      const res = await send<{ message: Message }>(`/api/chat/${other.id}`, "POST", { text: t, replyTo: replyTo?.id });
      setMessages((cur) => cur.map((m) => (m.id === temp.id ? res.message : m)));
      lastTs.current = Math.max(lastTs.current, res.message.ts);
      lastActivity.current = Date.now();
    } catch (e) {
      setMessages((cur) => cur.filter((m) => m.id !== temp.id));
      if (!preset) setText(t);
      toast((e as Error).message, true);
    }
  }

  async function sendMedia(kind: "image" | "voice", blob: Blob, dur?: number) {
    const localUrl = URL.createObjectURL(blob);
    const temp: Msg = { id: `tmp-${Date.now()}`, from: me, text: "", ts: Date.now(), pending: true, kind, media: { url: localUrl, dur }, localUrl };
    stick.current = true;
    setMessages((cur) => [...cur, temp]);
    const form = new FormData();
    const type = blob.type.split(";")[0] || (kind === "image" ? "image/jpeg" : "audio/webm");
    const ext = kind === "image" ? "jpg" : type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
    form.append("file", new File([blob], `${kind}.${ext}`, { type }));
    form.append("kind", kind);
    if (dur) form.append("dur", String(dur));
    if (replyTo) form.append("replyTo", replyTo.id);
    setReplyTo(null);
    try {
      const res = await send<{ message: Message }>(`/api/chat/${other.id}/media`, "POST", form);
      setMessages((cur) => cur.map((m) => (m.id === temp.id ? { ...res.message, localUrl } : m)));
      lastTs.current = Math.max(lastTs.current, res.message.ts);
      lastActivity.current = Date.now();
    } catch (e) {
      setMessages((cur) => cur.filter((m) => m.id !== temp.id));
      toast((e as Error).message, true);
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return toast("Voice notes aren't supported in this browser.", true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
      chunks.current = [];
      recCancel.current = false;
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      const started = Date.now();
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const secs = Math.round((Date.now() - started) / 1000);
        setRec(null);
        if (recCancel.current || secs < 1) return;
        sendMedia("voice", new Blob(chunks.current, { type: r.mimeType || "audio/webm" }), secs);
      };
      r.start(250);
      recorder.current = r;
      setRec({ start: started, secs: 0 });
    } catch {
      toast("Allow microphone access to record a voice note.", true);
    }
  }
  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => {
      const secs = Math.floor((Date.now() - rec.start) / 1000);
      setRec((r) => (r ? { ...r, secs } : r));
      if (secs >= 120) recorder.current?.stop();
    }, 250);
    return () => clearInterval(t);
  }, [rec]);
  const stopRecording = (cancel: boolean) => {
    recCancel.current = cancel;
    recorder.current?.stop();
  };

  async function act(mid: string, action: "react" | "delete", emoji?: string) {
    setActive(null);
    try {
      if (action === "react") {
        const res = await send<{ meta: ChatMeta }>(`/api/chat/${other.id}/action`, "POST", { action, mid, emoji });
        setMeta(res.meta);
      } else {
        const res = await send<{ message: Message }>(`/api/chat/${other.id}/action`, "POST", { action, mid });
        setMessages((cur) => cur.map((m) => (m.id === mid ? res.message : m)));
      }
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  async function respondMeet(mid: string, accept: boolean) {
    try {
      const res = await send<{ message: Message }>(`/api/chat/${other.id}/meet`, "POST", { mid, accept });
      setMeets((m) => ({ ...m, [mid]: accept ? "accepted" : "declined" }));
      stick.current = true;
      merge([res.message]);
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  async function propose(meet: { when: string; mode: MeetMode; place?: string }) {
    try {
      const res = await send<{ message: Message }>(`/api/chat/${other.id}`, "POST", { kind: "meet", meet });
      setMeets((m) => ({ ...m, [res.message.id]: "proposed" }));
      stick.current = true;
      merge([res.message]);
      setPanel(null);
      toast(`Sent to ${first}. You'll see their answer here.`);
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  const call = (video: boolean) => startCall({ id: other.id, name: other.name, photo: other.photo, video });

  const block = async () => {
    try {
      await send("/api/block", "POST", { id: other.id, blocked: true });
      toast(`${first} is blocked.`);
      router.push("/chat");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const jumpTo = (id: string) => {
    const el = document.getElementById(`m-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 1200);
  };

  const deleted = new Set(meta.del);
  const visible = messages.map((m) => (deleted.has(m.id) && m.kind !== "deleted" ? { ...m, kind: "deleted" as const, text: "", media: undefined } : m));
  const conversationStarted = visible.some((m) => m.kind !== "note");
  let lastDay = "";

  return (
    <section className="convo" aria-label={`Chat with ${other.name}`}>
      <div className="convo-head">
        <Link className="icon-btn" href="/chat" aria-label="All chats">
          <Icon name="back" />
        </Link>
        <Link className="who" href={`/profile/${other.id}`}>
          <span className="avatar sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {other.photo ? <img src={other.photo} alt="" /> : <Silhouette />}
          </span>
          <span style={{ minWidth: 0 }}>
            <b>{other.name}</b>
            <span>{!online ? "Reconnecting…" : typing ? "typing…" : other.line}</span>
          </span>
        </Link>
        <button className="icon-btn" onClick={() => call(false)} aria-label={`Voice call ${first}`} title="Voice call">
          <Icon name="phone" />
        </button>
        <button className="icon-btn" onClick={() => call(true)} aria-label={`Video call ${first}`} title="Video call">
          <Icon name="video" />
        </button>
        <div className="convo-menu">
          <button className="icon-btn" aria-label="More options" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            <Icon name="more" />
          </button>
          {menu ? (
            <div className="menu" role="menu" onClick={() => setMenu(false)}>
              <Link role="menuitem" href={`/profile/${other.id}`}><Icon name="doc" />View biodata</Link>
              <a role="menuitem" href={`/api/pdf?id=${other.id}&t=royal`}><Icon name="download" />Download biodata PDF</a>
              <button role="menuitem" onClick={() => setPanel("plan")}><Icon name="calendar" />Plan a meeting</button>
              <Link role="menuitem" href="/safety"><Icon name="shield" />Safety tips</Link>
              <button role="menuitem" className="danger" onClick={() => setConfirmBlock(true)}><Icon name="ban" />Block {first}</button>
            </div>
          ) : null}
        </div>
      </div>
      {confirmBlock ? (
        <div className="convo-confirm" role="alert">
          <span>Block {first}? You won&apos;t see each other or be able to chat.</span>
          <button className="btn btn-sm btn-danger-solid" onClick={block}>Block</button>
          <button className="btn btn-quiet btn-sm" onClick={() => setConfirmBlock(false)}>Cancel</button>
        </div>
      ) : null}

      <div className="convo-body" ref={body} onScroll={onScroll} aria-live="polite" onClick={(e) => (e.target as HTMLElement).closest(".msg-wrap") || setActive(null)}>
        <span className="chip-date" style={{ maxWidth: 440, textAlign: "center" }}>
          <Icon name="lock" className="ico" /> You&apos;re connected. Never send money or share OTPs or bank details. <Link href="/safety">Safety tips</Link>
        </span>
        {visible.map((m, i) => {
          const day = dayLabel(m.ts);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.from === me;
          const prev = visible[i - 1];
          const cont = !showDay && prev && prev.from === m.from && m.ts - prev.ts < 5 * 60 * 1000 && !["meet", "call"].includes(prev.kind ?? "");
          const read = mine && !m.pending && theirRead >= m.ts;
          const rx = meta.rx[m.id] ?? {};
          const rxList = Object.entries(rx);
          const canDelete = mine && !m.pending && m.kind !== "deleted" && Date.now() - m.ts < 60 * 60_000 && !["meet", "call", "note"].includes(m.kind ?? "");
          const warn = !mine && m.kind !== "deleted" && MONEY.test(m.text);
          return (
            <Fragment key={m.id}>
              {showDay ? <span className="chip-date">{day}</span> : null}
              {m.kind === "meet" && m.meet ? (
                <MeetCard m={m} mine={mine} status={meets[m.id] ?? "proposed"} other={first} onRespond={(a) => respondMeet(m.id, a)} />
              ) : m.kind === "call" ? (
                <CallCard m={m} mine={mine} outcome={m.call ? calls[m.call.id] : undefined} other={first} onCall={call} />
              ) : (
                <div id={`m-${m.id}`} className={`msg-wrap ${mine ? "out" : "in"}${active === m.id ? " active" : ""}`}>
                  <div
                    className={`msg ${mine ? "out" : "in"}${cont ? " cont" : ""}${m.pending ? " pending" : ""}${m.kind === "note" ? " note" : ""}${m.kind === "image" ? " has-image" : ""}${m.kind === "deleted" ? " deleted" : ""}${rxList.length ? " has-rx" : ""}`}
                    onContextMenu={(e) => {
                      if (m.pending || m.kind === "deleted") return;
                      e.preventDefault();
                      setActive(m.id);
                    }}
                    onPointerDown={(e) => {
                      if (e.pointerType !== "touch" || m.pending || m.kind === "deleted") return;
                      press.current = setTimeout(() => setActive(m.id), 450);
                    }}
                    onPointerUp={() => press.current && clearTimeout(press.current)}
                    onPointerMove={() => press.current && clearTimeout(press.current)}
                    onDoubleClick={() => !m.pending && m.kind !== "deleted" && act(m.id, "react", "❤️")}
                  >
                    {m.kind === "note" ? (
                      <span className="note-head">
                        <Icon name="heart" />
                        {mine ? "Your note with the interest" : `${first}'s note with the interest`}
                        {m.quote ? <q>{m.quote}</q> : null}
                      </span>
                    ) : null}
                    {m.reply ? (
                      <button type="button" className="reply-quote" onClick={() => jumpTo(m.reply!.id)}>
                        <b>{m.reply.from === me ? "You" : first}</b>
                        <span>{byId.get(m.reply.id)?.kind === "deleted" || deleted.has(m.reply.id) ? "🚫 Message deleted" : m.reply.text}</span>
                      </button>
                    ) : null}
                    {m.kind === "deleted" ? (
                      <span className="deleted-text"><Icon name="ban" />{mine ? "You deleted this message" : "This message was deleted"}</span>
                    ) : m.kind === "image" && m.media ? (
                      <button type="button" className="chat-photo" onClick={() => setLightbox(m.media!.url)} aria-label="Open photo">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.media.url} alt="Photo" loading="lazy" />
                      </button>
                    ) : m.kind === "voice" && m.media ? (
                      <VoicePlayer url={m.media.url} dur={m.media.dur} mine={mine} />
                    ) : null}
                    {m.text && m.kind !== "deleted" ? <Linkified text={m.text} /> : null}
                    <span className="time">
                      {clock(m.ts)}
                      {mine && m.kind !== "deleted" ? (
                        m.pending ? <Icon name="clock" /> : <Icon name={read ? "dtick" : "check"} className={`ico${read ? " read" : ""}`} title={read ? "Read" : "Sent"} />
                      ) : null}
                    </span>
                    {rxList.length ? (
                      <span className="rx">
                        {[...new Set(rxList.map(([, e]) => e))].map((e) => (
                          <button
                            type="button"
                            key={e}
                            aria-pressed={rx[me] === e}
                            onClick={() => act(m.id, "react", e)}
                            title={rxList.filter(([, x]) => x === e).map(([u]) => (u === me ? "You" : first)).join(", ")}
                          >
                            {e}
                            {rxList.filter(([, x]) => x === e).length > 1 ? <small>{rxList.filter(([, x]) => x === e).length}</small> : null}
                          </button>
                        ))}
                      </span>
                    ) : null}
                  </div>
                  {!m.pending && m.kind !== "deleted" ? (
                    <div className="msg-tools" role="toolbar" aria-label="Message actions">
                      <span className="rx-pick">
                        {REACTIONS.map((e) => (
                          <button key={e} type="button" aria-label={`React ${e}`} aria-pressed={rx[me] === e} onClick={() => act(m.id, "react", e)}>
                            {e}
                          </button>
                        ))}
                      </span>
                      <button type="button" aria-label="Reply" title="Reply" onClick={() => { setReplyTo(m); setActive(null); box.current?.focus(); }}>
                        <Icon name="reply" />
                      </button>
                      {m.text ? (
                        <button type="button" aria-label="Copy" title="Copy" onClick={() => { navigator.clipboard?.writeText(m.text).then(() => toast("Copied.")); setActive(null); }}>
                          <Icon name="copy" />
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button type="button" aria-label="Delete for everyone" title="Delete for everyone" onClick={() => act(m.id, "delete")}>
                          <Icon name="trash" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {warn ? (
                    <p className="money-warn">
                      <Icon name="shield" />
                      Careful: never send money, share an OTP or bank details with someone you met online. <Link href="/safety">Why?</Link>
                    </p>
                  ) : null}
                </div>
              )}
            </Fragment>
          );
        })}
        {typing ? (
          <div className="msg in typing-bubble" aria-label={`${first} is typing`}>
            <i /><i /><i />
          </div>
        ) : null}
        {!conversationStarted && starters.length ? (
          <div className="starters">
            <span className="chip-date">Not sure how to begin? Tap one to send it.</span>
            {starters.map((st) => (
              <button key={st} type="button" className="chip-btn" onClick={() => submit(st)}>
                {st}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {unseen > 0 ? (
        <button className="to-bottom" onClick={toBottom} aria-label={`${unseen} new messages`}>
          <Icon name="chevron" />
          <span className="badge">{unseen}</span>
        </button>
      ) : null}

      {panel === "plan" ? <PlanForm first={first} onCancel={() => setPanel(null)} onSend={propose} /> : null}
      {panel === "emoji" ? (
        <div className="emoji-panel">
          <div className="emoji-grid">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => { setText((t) => t + e); box.current?.focus(); }}>{e}</button>
            ))}
          </div>
          <div className="quick">
            {QUICK.map((q) => (
              <button key={q} type="button" className="chip-btn" onClick={() => submit(q)}>{q}</button>
            ))}
          </div>
        </div>
      ) : null}

      {replyTo ? (
        <div className="reply-bar">
          <Icon name="reply" />
          <span>
            <b>Replying to {replyTo.from === me ? "yourself" : first}</b>
            <small>{replyTo.text || (replyTo.kind === "image" ? "📷 Photo" : replyTo.kind === "voice" ? "🎤 Voice note" : "")}</small>
          </span>
          <button className="icon-btn" aria-label="Cancel reply" onClick={() => setReplyTo(null)}><Icon name="x" /></button>
        </div>
      ) : null}

      {!rec && hasContact(text) ? (
        <p className="contact-hint" role="status">
          <span aria-hidden="true">📵</span>
          Phone numbers, emails and WhatsApp links are hidden automatically. Use the 📞 call button to talk; numbers are in each other&apos;s biodata once connected.
        </p>
      ) : null}

      {rec ? (
        <div className="composer recording">
          <button type="button" className="icon-btn" aria-label="Cancel recording" onClick={() => stopRecording(true)}>
            <Icon name="trash" />
          </button>
          <span className="rec-dot" aria-hidden="true" />
          <span className="rec-time">{mmss(rec.secs)}</span>
          <span className="rec-hint">Recording voice note… (up to 2 minutes)</span>
          <button className="send" aria-label="Send voice note" onClick={() => stopRecording(false)}>
            <Icon name="send" />
          </button>
        </div>
      ) : (
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <button type="button" className="icon-btn tool-btn" aria-label="Emoji and quick replies" aria-expanded={panel === "emoji"} onClick={() => setPanel(panel === "emoji" ? null : "emoji")}>
            <Icon name="smile" />
          </button>
          <button type="button" className="icon-btn tool-btn" aria-label="Send a photo" onClick={() => fileInput.current?.click()}>
            <Icon name="camera" />
          </button>
          <button type="button" className="icon-btn tool-btn plan-btn" aria-label="Plan a call or meeting" title="Plan a call or meeting" aria-expanded={panel === "plan"} onClick={() => setPanel(panel === "plan" ? null : "plan")}>
            <Icon name="calendar" />
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.size > 15 * 1024 * 1024) return toast("That photo is too large.", true);
              sendMedia("image", await compress(f));
            }}
          />
          <label htmlFor="composer" className="sr-only">Message</label>
          <textarea
            id="composer"
            ref={box}
            rows={1}
            value={text}
            maxLength={2000}
            placeholder="Message"
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value) pingTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape") setReplyTo(null);
            }}
          />
          {text.trim() ? (
            <button className="send" aria-label="Send">
              <Icon name="send" />
            </button>
          ) : (
            <button type="button" className="send mic" aria-label="Record a voice note" onClick={startRecording}>
              <Icon name="mic" />
            </button>
          )}
        </form>
      )}

      {lightbox ? (
        <div className="lightbox" role="dialog" aria-label="Photo" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Photo" />
          <button className="icon-btn" aria-label="Close photo"><Icon name="x" /></button>
        </div>
      ) : null}
    </section>
  );
}

function PlanForm({ first, onCancel, onSend }: { first: string; onCancel: () => void; onSend: (m: { when: string; mode: MeetMode; place?: string }) => void }) {
  const [mode, setMode] = useState<MeetMode>("Video call");
  const [when, setWhen] = useState(() => {
    const d = new Date(Date.now() + 2 * 86400_000);
    d.setHours(18, 0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });
  const [place, setPlace] = useState("");
  return (
    <form
      className="plan-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSend({ mode, when: new Date(when).toISOString(), place: place.trim() || undefined });
      }}
    >
      <b>Plan something with {first}</b>
      <div className="multi">
        {MEET_MODES.map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
            <Icon name={MODE_ICON[m]} />
            {m}
          </button>
        ))}
      </div>
      <div className="row">
        <label className="field" style={{ flex: "1 1 200px" }}>
          <span>When</span>
          <input type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} required />
        </label>
        <label className="field" style={{ flex: "1 1 200px" }}>
          <span>{mode === "Coffee meet" || mode === "Family visit" ? "Where" : "Note (optional)"}</span>
          <input className="input" value={place} maxLength={120} onChange={(e) => setPlace(e.target.value)} placeholder={mode === "Family visit" ? "e.g. Our home in Vijay Nagar" : mode === "Coffee meet" ? "e.g. Indian Coffee House" : "e.g. After dinner is best"} />
        </label>
      </div>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-quiet btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-brand btn-sm">
          <Icon name="send" />
          Propose
        </button>
      </div>
    </form>
  );
}
