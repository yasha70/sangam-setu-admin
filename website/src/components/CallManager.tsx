"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, Silhouette } from "./Icon";
import { toast } from "./Toaster";

type Peer = { id: string; name: string; photo: string | null };
type Phase = "idle" | "incoming" | "outgoing" | "connecting" | "active" | "ended";
type Signal = { type: "offer" | "answer"; sdp: RTCSessionDescriptionInit } | { type: "candidate"; candidate: RTCIceCandidateInit };

/** Starts a voice or video call from anywhere (the chat header, a call card). */
export function startCall(peer: Peer & { video: boolean }) {
  window.dispatchEvent(new CustomEvent("sangam-call-start", { detail: peer }));
}

const END_TEXT: Record<string, string> = {
  declined: "Call declined",
  missed: "No answer",
  cancelled: "Call cancelled",
  ended: "Call ended",
  failed: "Couldn't connect on this network",
};

/** A gentle two-tone ring made with Web Audio, so there is no sound file to load. */
function useRinger() {
  const ctx = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    navigator.vibrate?.(0);
  }, []);
  const play = useCallback(
    (kind: "incoming" | "outgoing") => {
      stop();
      const beep = () => {
        try {
          ctx.current ??= new AudioContext();
          const c = ctx.current;
          const tones = kind === "incoming" ? [880, 660, 880, 660] : [440, 480];
          tones.forEach((f, i) => {
            const o = c.createOscillator();
            const g = c.createGain();
            o.frequency.value = f;
            g.gain.setValueAtTime(0, c.currentTime + i * 0.18);
            g.gain.linearRampToValueAtTime(kind === "incoming" ? 0.12 : 0.05, c.currentTime + i * 0.18 + 0.02);
            g.gain.linearRampToValueAtTime(0, c.currentTime + i * 0.18 + 0.16);
            o.connect(g).connect(c.destination);
            o.start(c.currentTime + i * 0.18);
            o.stop(c.currentTime + i * 0.18 + 0.18);
          });
        } catch {
          // audio blocked until the person interacts with the page; the banner still shows
        }
        if (kind === "incoming") navigator.vibrate?.([300, 150, 300]);
      };
      beep();
      timer.current = setInterval(beep, kind === "incoming" ? 2200 : 3000);
    },
    [stop],
  );
  useEffect(() => stop, [stop]);
  return { play, stop };
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function CallManager() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [peer, setPeer] = useState<Peer | null>(null);
  const [video, setVideo] = useState(false);
  const [endReason, setEndReason] = useState("");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [weak, setWeak] = useState(false);

  const callId = useRef<string | null>(null);
  const role = useRef<"caller" | "callee">("caller");
  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const remote = useRef<MediaStream | null>(null);
  const after = useRef(0);
  const pending = useRef<RTCIceCandidateInit[]>([]);
  const poll = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissed = useRef(new Set<string>());
  const facing = useRef<"user" | "environment">("user");
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const { play, stop: stopRing } = useRinger();

  const attach = useCallback(() => {
    if (localVideo.current && local.current) localVideo.current.srcObject = local.current;
    if (remoteVideo.current && remote.current) remoteVideo.current.srcObject = remote.current;
    if (remoteAudio.current && remote.current) remoteAudio.current.srcObject = remote.current;
  }, []);
  useEffect(attach, [phase, attach]);

  const teardown = useCallback(
    (reason: string, notifyServer: boolean) => {
      stopRing();
      if (poll.current) clearTimeout(poll.current);
      if (tick.current) clearInterval(tick.current);
      if (connectTimer.current) clearTimeout(connectTimer.current);
      poll.current = tick.current = connectTimer.current = null;
      if (notifyServer && callId.current) {
        fetch(`/api/call/${callId.current}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "end" }), keepalive: true }).catch(() => {});
      }
      local.current?.getTracks().forEach((t) => t.stop());
      pc.current?.close();
      pc.current = local.current = remote.current = null;
      callId.current = null;
      pending.current = [];
      after.current = 0;
      setEndReason(END_TEXT[reason] ?? reason);
      setPhase("ended");
      setTimeout(() => {
        setPhase((p) => (p === "ended" ? "idle" : p));
        setPeer(null);
        setSeconds(0);
        setMuted(false);
        setCamOff(false);
        setWeak(false);
      }, 2200);
    },
    [stopRing],
  );

  const signal = useCallback(async (data: Signal) => {
    if (!callId.current) return;
    await fetch(`/api/call/${callId.current}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "signal", data }) }).catch(() => {});
  }, []);

  const flushCandidates = useCallback(async () => {
    const conn = pc.current;
    if (!conn?.remoteDescription) return;
    for (const c of pending.current.splice(0)) await conn.addIceCandidate(c).catch(() => {});
  }, []);

  const startPolling = useCallback(() => {
    const loop = async () => {
      const id = callId.current;
      if (!id) return;
      try {
        const res = await fetch(`/api/call/${id}?after=${after.current}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { call: { status: string; answeredAt?: number }; signals: { seq: number; data: Signal }[] };
          if (["ended", "declined", "missed", "cancelled"].includes(data.call.status)) return teardown(data.call.status, false);
          if (data.call.status === "active" && role.current === "caller") {
            stopRing();
            setPhase((p) => (p === "outgoing" ? "connecting" : p));
          }
          const conn = pc.current;
          for (const s of data.signals) {
            after.current = Math.max(after.current, s.seq);
            if (!conn) continue;
            const d = s.data;
            if (d.type === "offer" && role.current === "callee") {
              await conn.setRemoteDescription(d.sdp);
              await flushCandidates();
              const answer = await conn.createAnswer();
              await conn.setLocalDescription(answer);
              await signal({ type: "answer", sdp: answer });
            } else if (d.type === "answer" && role.current === "caller" && !conn.remoteDescription) {
              await conn.setRemoteDescription(d.sdp);
              await flushCandidates();
            } else if (d.type === "candidate") {
              if (conn.remoteDescription) await conn.addIceCandidate(d.candidate).catch(() => {});
              else pending.current.push(d.candidate);
            }
          }
        } else if (res.status === 404) {
          return teardown("ended", false);
        }
      } catch {
        // a missed poll is fine; try again
      }
      const connected = pc.current?.connectionState === "connected";
      poll.current = setTimeout(loop, connected ? 2000 : 700);
    };
    loop();
  }, [flushCandidates, signal, stopRing, teardown]);

  const setupPeer = useCallback(
    async (servers: RTCIceServer[], withVideo: boolean) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: withVideo ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });
      local.current = stream;
      const conn = new RTCPeerConnection({ iceServers: servers });
      pc.current = conn;
      stream.getTracks().forEach((t) => conn.addTrack(t, stream));
      conn.ontrack = (e) => {
        remote.current = e.streams[0] ?? new MediaStream([e.track]);
        attach();
      };
      conn.onicecandidate = (e) => {
        if (e.candidate) signal({ type: "candidate", candidate: e.candidate.toJSON() });
      };
      conn.onconnectionstatechange = () => {
        const st = conn.connectionState;
        if (st === "connected") {
          if (connectTimer.current) clearTimeout(connectTimer.current);
          setWeak(false);
          setPhase((p) => {
            if (p !== "active") {
              setSeconds(0);
              if (tick.current) clearInterval(tick.current);
              tick.current = setInterval(() => setSeconds((n) => n + 1), 1000);
            }
            return "active";
          });
        } else if (st === "disconnected") {
          setWeak(true);
        } else if (st === "failed") {
          teardown("failed", true);
        }
      };
      attach();
      return conn;
    },
    [attach, signal, teardown],
  );

  // Outgoing calls
  useEffect(() => {
    const on = async (e: Event) => {
      const d = (e as CustomEvent<Peer & { video: boolean }>).detail;
      if (callId.current) return toast("You're already on a call.", true);
      setPeer({ id: d.id, name: d.name, photo: d.photo });
      setVideo(d.video);
      role.current = "caller";
      setPhase("outgoing");
      try {
        const res = await fetch("/api/call", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: d.id, video: d.video }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't start the call.");
        callId.current = data.call.id;
        const conn = await setupPeer(data.iceServers, d.video);
        const offer = await conn.createOffer();
        await conn.setLocalDescription(offer);
        await signal({ type: "offer", sdp: offer });
        play("outgoing");
        startPolling();
      } catch (err) {
        const msg = (err as Error).name === "NotAllowedError" ? "Allow microphone and camera access to call." : (err as Error).message;
        toast(msg, true);
        teardown("ended", true);
      }
    };
    window.addEventListener("sangam-call-start", on);
    return () => window.removeEventListener("sangam-call-start", on);
  }, [play, setupPeer, signal, startPolling, teardown]);

  // Incoming calls: a light check every few seconds while the page is open
  useEffect(() => {
    if (phase !== "idle") return;
    let stop = false;
    const check = async () => {
      if (document.hidden || stop) return;
      try {
        const res = await fetch("/api/call/ring", { cache: "no-store" });
        if (!res.ok) return;
        const { call } = (await res.json()) as { call: (Peer & { id: string; video: boolean; from: string }) | null };
        if (call && !dismissed.current.has(call.id) && !stop) {
          callId.current = call.id;
          role.current = "callee";
          setPeer({ id: call.from, name: call.name, photo: call.photo });
          setVideo(call.video);
          setPhase("incoming");
          play("incoming");
        }
      } catch {
        // offline
      }
    };
    check();
    const t = setInterval(check, 4000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [phase, play]);

  // While ringing, notice if the caller hangs up
  useEffect(() => {
    if (phase !== "incoming") return;
    const t = setInterval(async () => {
      const id = callId.current;
      if (!id) return;
      const res = await fetch(`/api/call/${id}?after=999999`, { cache: "no-store" }).catch(() => null);
      const data = res?.ok ? await res.json() : null;
      if (!data || data.call.status !== "ringing") {
        dismissed.current.add(id);
        teardown(data?.call.status === "cancelled" ? "missed" : "ended", false);
      }
    }, 2500);
    return () => clearInterval(t);
  }, [phase, teardown]);

  useEffect(() => {
    const bye = () => {
      if (callId.current && phase !== "incoming") {
        navigator.sendBeacon?.(`/api/call/${callId.current}`, new Blob([JSON.stringify({ action: "end" })], { type: "application/json" }));
      }
    };
    window.addEventListener("pagehide", bye);
    return () => window.removeEventListener("pagehide", bye);
  }, [phase]);

  const accept = async () => {
    const id = callId.current;
    if (!id) return;
    stopRing();
    setPhase("connecting");
    try {
      const [ice, res] = await Promise.all([
        fetch("/api/call").then((r) => r.json()),
        fetch(`/api/call/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept" }) }),
      ]);
      if (!res.ok) throw new Error("This call has ended.");
      await setupPeer(ice.iceServers, video);
      startPolling();
      connectTimer.current = setTimeout(() => {
        if (pc.current?.connectionState !== "connected") teardown("failed", true);
      }, 30_000);
    } catch (err) {
      toast((err as Error).name === "NotAllowedError" ? "Allow microphone and camera access to answer." : (err as Error).message, true);
      teardown("ended", true);
    }
  };

  const decline = async () => {
    const id = callId.current;
    if (id) {
      dismissed.current.add(id);
      await fetch(`/api/call/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "decline" }) }).catch(() => {});
    }
    callId.current = null;
    teardown("declined", false);
  };

  const toggleMute = () => {
    const next = !muted;
    local.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  };
  const toggleCam = () => {
    const next = !camOff;
    local.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCamOff(next);
  };
  const flip = async () => {
    try {
      facing.current = facing.current === "user" ? "environment" : "user";
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing.current } });
      const track = s.getVideoTracks()[0];
      const sender = pc.current?.getSenders().find((x) => x.track?.kind === "video");
      await sender?.replaceTrack(track);
      local.current?.getVideoTracks().forEach((t) => {
        t.stop();
        local.current?.removeTrack(t);
      });
      local.current?.addTrack(track);
      attach();
    } catch {
      toast("Couldn't switch camera.", true);
    }
  };

  if (phase === "idle" || !peer) return null;

  if (phase === "incoming") {
    return (
      <div className="ringing" role="alertdialog" aria-labelledby="ring-title">
        <span className="avatar ring-pulse">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {peer.photo ? <img src={peer.photo} alt="" /> : <Silhouette />}
        </span>
        <div className="ring-text">
          <b id="ring-title">{peer.name}</b>
          <span>Incoming {video ? "video" : "voice"} call…</span>
        </div>
        <button className="call-btn end" onClick={decline} aria-label="Decline call">
          <Icon name="phone" />
        </button>
        <button className="call-btn answer" onClick={accept} aria-label="Answer call">
          <Icon name={video ? "video" : "phone"} />
        </button>
      </div>
    );
  }

  const status =
    phase === "ended" ? endReason : phase === "outgoing" ? "Ringing…" : phase === "connecting" ? "Connecting…" : weak ? "Reconnecting…" : fmt(seconds);

  return (
    <div className={`call-screen${video ? " is-video" : ""}`} role="dialog" aria-label={`Call with ${peer.name}`}>
      {video ? (
        <>
          <video ref={remoteVideo} className="remote-video" autoPlay playsInline />
          <video ref={localVideo} className="local-video" autoPlay playsInline muted data-off={camOff ? "true" : undefined} />
        </>
      ) : (
        <audio ref={remoteAudio} autoPlay />
      )}
      <div className="call-top">
        {!video || phase !== "active" ? (
          <span className="avatar call-avatar" data-live={phase === "active" ? "true" : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {peer.photo ? <img src={peer.photo} alt="" /> : <Silhouette />}
          </span>
        ) : null}
        <b>{peer.name}</b>
        <span className="call-status" aria-live="polite">{status}</span>
        <small><Icon name="lock" />Private call, straight between your two devices</small>
      </div>
      {phase !== "ended" ? (
        <div className="call-controls">
          <button className="call-btn" aria-pressed={muted} onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
            <Icon name="mic" />
            <span>{muted ? "Unmute" : "Mute"}</span>
          </button>
          {video ? (
            <>
              <button className="call-btn" aria-pressed={camOff} onClick={toggleCam} aria-label={camOff ? "Turn camera on" : "Turn camera off"}>
                <Icon name="video" />
                <span>{camOff ? "Camera on" : "Camera off"}</span>
              </button>
              <button className="call-btn" onClick={flip} aria-label="Switch camera">
                <Icon name="undo" />
                <span>Flip</span>
              </button>
            </>
          ) : null}
          <button className="call-btn end" onClick={() => teardown(phase === "outgoing" ? "cancelled" : "ended", true)} aria-label="End call">
            <Icon name="phone" />
            <span>End</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
