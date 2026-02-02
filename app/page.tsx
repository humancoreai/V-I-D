"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Mode = "note" | "formatted" | "actions";

type ApiResponse = {
  ok: true;
  transcript: string;
  outputs: {
    note: { title: string; bullets: string[] };
    formatted: { markdown: string };
    actions: { items: { action: string; due?: string; confidence: number }[] };
  };
  meta: {
    durationMs: number;
    mimeType: string;
    mode?: Mode;
    transcriptionProvider?: string;
    warning?: string | null;
  };
};

function serializeForClipboard(mode: Mode, result: ApiResponse): string {
  if (mode === "note") {
    const { title, bullets } = result.outputs.note;
    return `${title}\n\n- ${bullets.join("\n- ")}`;
  }
  if (mode === "formatted") {
    return result.outputs.formatted.markdown;
  }
  // actions (human-first)
  const items = result.outputs.actions.items || [];
  if (!items.length) return "Keine Aktionen erkannt.";
  return items
    .map((it) => {
      const due = it.due ? `due: ${it.due}` : "due: -";
      const conf = typeof it.confidence === "number" ? `confidence: ${Math.round(it.confidence * 100)}%` : "confidence: -";
      return `${it.action}\n${due} · ${conf}`;
    })
    .join("\n\n");
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("note");
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<string>("bereit");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [audioProof, setAudioProof] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const levelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number>(0);

  const canRecord = useMemo(() => {
    return typeof window !== "undefined" && !!navigator?.mediaDevices?.getUserMedia;
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup falls beim Reload noch Recorder läuft
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {}

      try {
        void stopLevelMeter();
      } catch {}
    };
  }, []);



  function startLevelMeter(stream: MediaStream) {
    const canvas = levelCanvasRef.current;
    if (!canvas) return;

    // Stop any previous meter
    void stopLevelMeter();

    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024; // stable for RMS
    analyser.smoothingTimeConstant = 0.85;
    analyserRef.current = analyser;

    source.connect(analyser);

    const data = new Uint8Array(analyser.fftSize);
    const c2d = canvas.getContext("2d");
    if (!c2d) return;

    const draw = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteTimeDomainData(data);

      // RMS level 0..1
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const level = Math.min(1, Math.max(0, rms * 2.2)); // boost a bit for speech

      const w = canvas.width;
      const h = canvas.height;

      c2d.clearRect(0, 0, w, h);
      // background outline is via CSS border; draw a filled bar
      const barW = Math.round(level * w);
      c2d.fillRect(0, 0, barW, h);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
  }

  async function stopLevelMeter() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    try {
      analyserRef.current?.disconnect();
    } catch {}
    analyserRef.current = null;

    if (audioCtxRef.current) {
      try {
        await audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
  }


  async function startRecording() {
    setError(null);
    setResult(null);
    setTranscript("");
    setAudioProof("");
    setStatus("Mikrofon wird angefordert …");

    if (!canRecord) {
      setError("Browser-API für Audioaufnahme ist nicht verfügbar.");
      setStatus("Fehler");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      startLevelMeter(stream);

      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ];
      const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      startedAtRef.current = Date.now();

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onerror = () => {
        void stopLevelMeter();
        setError("Aufnahmefehler im MediaRecorder.");
        setStatus("Fehler");
      };

      mr.onstart = () => {
        setIsRecording(true);
        setStatus("aufnehmen …");
      };

      mr.onstop = async () => {
      await stopLevelMeter();
        setIsRecording(false);
        setStatus("Upload & Verarbeitung …");

        // Stream sauber schließen
        stream.getTracks().forEach((t) => t.stop());

        const durationMs = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });

        setAudioProof(
          `audio: ${Math.round(blob.size / 1024)} KB · ${durationMs} ms · ${blob.type || "unknown"}`
        );

        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          form.append("mode", mode);
          form.append("durationMs", String(durationMs));
          form.append("mimeType", blob.type);

          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: form,
          });

          if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || `HTTP ${res.status}`);
          }

          const json = (await res.json()) as ApiResponse;
          setResult(json);
          setTranscript(json.transcript);
          setStatus("fertig");
        } catch (err: any) {
      void stopLevelMeter();
          setError(`API-Fehler: ${err?.message || String(err)}`);
          setStatus("Fehler");
        }
      };

      mr.start(); // keine timeslice -> ein Blob beim Stop
    } catch (err: any) {
      void stopLevelMeter();
      setError(
        err?.name === "NotAllowedError"
          ? "Mikrofon-Zugriff verweigert. Erlaube das Mikrofon für die App."
          : `getUserMedia-Fehler: ${err?.message || String(err)}`
      );
      setStatus("Fehler");
    }
  }

  function stopRecording() {
    setError(null);
    setStatus("stoppen …");

    const mr = mediaRecorderRef.current;
    if (!mr) return;

    try {
      if (mr.state !== "inactive") mr.stop();
    } catch (e: any) {
      setError(`Stop-Fehler: ${e?.message || String(e)}`);
      setStatus("Fehler");
    }
  }

  const outputView = useMemo(() => {
    if (!result) return null;

    if (mode === "note") {
      return (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{result.outputs.note.title}</div>
          <ul style={{ marginTop: 0 }}>
            {result.outputs.note.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      );
    }

    if (mode === "formatted") {
      return (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            border: "1px solid #ddd",
            padding: 10,
            borderRadius: 8,
            background: "#fafafa",
          }}
        >
          {result.outputs.formatted.markdown}
        </pre>
      );
    }

    return (
      <div>
        {result.outputs.actions.items.map((it, i) => (
          <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <div style={{ fontWeight: 600 }}>{it.action}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              due: {it.due || "—"} · confidence: {Math.round(it.confidence * 100)}%
            </div>
          </div>
        ))}
      </div>
    );
  }, [result, mode]);

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0 }}>Voice Intelligence</h2>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Hotkey: Ctrl+Shift+Space</div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
        <label style={{ fontSize: 13 }}>
          Modus:&nbsp;
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            disabled={isRecording}
          >
            <option value="note">Denken festhalten — strukturierte Notiz</option>
            <option value="formatted">Text produzieren — formatiert (Markdown)</option>
            <option value="actions">Handlungen ableiten — Action Items</option>
          </select>
	<div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
  	  Die Auswahl steuert, <b>wie</b> Sprache verarbeitet wird – nicht nur, wie sie formatiert ist.
	</div>
        </label>

        <div style={{ marginLeft: "auto", fontSize: 13 }}>
          Status: <b>{status}</b>
      <div style={{ marginTop: 6 }}>
        <canvas ref={levelCanvasRef} width={220} height={10}
          style={{ border: '1px solid #ddd', borderRadius: 6 }} />
      </div>
        </div>

        {audioProof && (
          <div style={{ fontSize: 12, opacity: 0.75, marginLeft: "auto" }}>
            {audioProof}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        {!isRecording ? (
          <button
            onClick={startRecording}
            style={{ padding: "10px 14px", borderRadius: 10, cursor: "pointer" }}
          >
            🎙️ Record
          </button>
        ) : (
          <button
            onClick={stopRecording}
            style={{ padding: "10px 14px", borderRadius: 10, cursor: "pointer" }}
          >
            ⏹️ Stop
          </button>
        )}

        <button
          onClick={() => {
            setResult(null);
            setTranscript("");
            setError(null);
            setAudioProof("");
            setStatus("bereit");
          }}
          style={{ padding: "10px 14px", borderRadius: 10, cursor: "pointer" }}
          disabled={isRecording}
        >
          Reset
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 10,
            background: "#fff5f5",
            border: "1px solid #ffd0d0",
          }}
        >
          <b>Fehler:</b> {error}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{result?.meta?.transcriptionProvider === "mock" ? "Transkript (Demo/Fallback)" : `Transkript (Provider: ${result?.meta?.transcriptionProvider || "?"})`}</div>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            border: "1px solid #ddd",
            padding: 10,
            borderRadius: 8,
            background: "#fafafa",
            minHeight: 70,
          }}
        >
          {transcript || "—"}
        </pre>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Output</div>
        <div
          style={{
            border: "1px solid #ddd",
            padding: 10,
            borderRadius: 8,
            background: "#fff",
            minHeight: 80,
          }}
        >
          {outputView || "—"}
        </div>
	<button
    onClick={async () => {
      if (!result) return;
      const text = serializeForClipboard(mode, result);
      await navigator.clipboard.writeText(text);
    }}
    disabled={!result}
    style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}
  >
    📋 Copy Output
  </button>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.75 }}>
        {result?.meta?.warning ? `Hinweis: ${result.meta.warning}` : (result?.meta?.transcriptionProvider === "mock" ? "Hinweis: Demo/Fallback aktiv (kein API-Key oder Fehler). " : "Hinweis: Transkription aktiv.")}
      </div>
    </div>
  );
}
