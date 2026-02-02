# Architecture Documentation

## Table of Contents
- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Architecture Diagram](#architecture-diagram)
- [Component Breakdown](#component-breakdown)
- [Data Flow](#data-flow)
- [State Management](#state-management)
- [Audio Processing Pipeline](#audio-processing-pipeline)
- [Enrichment Engine](#enrichment-engine)
- [Design Decisions](#design-decisions)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)
- [Security](#security)
- [Future Extensions](#future-extensions)

---

## System Overview

Voice Intelligence Desktop is a context-aware voice capture and enrichment application. The system transforms spoken input into structured outputs based on user intent through three distinct processing modes.

### Core Principle
**Context matters.** The same spoken input may need different outputs depending on the user's goal. Rather than applying generic AI transformation, we provide explicit modes that respect user intent.

### Key Components
1. **Desktop Shell** (Electron) - Window management, global shortcuts
2. **Frontend UI** (Next.js) - Recording interface, mode selection, results display
3. **API Layer** (Next.js API Routes) - Transcription orchestration, enrichment processing
4. **Audio Pipeline** (Browser MediaRecorder) - Audio capture, encoding, level metering
5. **Enrichment Engine** (Heuristic algorithms) - Mode-specific text transformation

---

## Technology Stack

### Desktop Runtime: Electron

**Version:** 28.x

**Why Electron?**
- **Mature ecosystem**: 7+ years of production use, extensive documentation
- **Next.js integration**: Seamless integration with modern React frameworks
- **Global shortcuts**: Robust, cross-platform global hotkey support
- **Window management**: Native window controls (hide/show, always-on-top)
- **Developer velocity**: Faster development for challenge timeline

**Trade-offs:**
- ✅ Reliability, maturity, ecosystem size
- ✅ Developer experience, documentation
- ❌ Bundle size (~100MB vs Tauri's ~3-5MB)
- ❌ Memory footprint (~150MB vs Tauri's ~50MB)

**Decision:** For a challenge/MVP, development speed and reliability trump bundle size.

---

### Frontend: Next.js 14 (App Router)

**Why Next.js?**
- **App Router**: Modern, file-based routing
- **TypeScript**: Zero-config TypeScript support
- **Static Export**: Perfect for Electron (no server needed)
- **React 19**: Latest React features (useOptimistic, etc.)
- **Developer Experience**: Fast Refresh, excellent debugging

**Configuration:**
```typescript
// next.config.ts
export default {
  output: 'export', // Static HTML export for Electron
}
```

---

### Transcription Providers

**Primary: Groq (Whisper Large v3)**
- Model: `whisper-large-v3`
- Speed: ~2-3x faster than OpenAI
- Cost: Free tier available
- Quality: State-of-the-art accuracy

**Fallback: OpenAI (Whisper v2)**
- Model: `whisper-1`
- Speed: Standard
- Cost: $0.006/minute
- Quality: Industry standard

**Mock Provider:**
- Used when no API keys configured
- Returns fixed transcript for testing
- Enables development without API dependencies

---

### Audio Encoding

**Format Preference:**
1. `audio/webm;codecs=opus` (preferred)
2. `audio/webm` (fallback)
3. `audio/ogg;codecs=opus` (fallback)
4. `audio/ogg` (last resort)

**Why Opus Codec?**
- **Compression**: ~12 kbps for speech (vs 128 kbps for MP3)
- **Quality**: Transparent quality at low bitrates
- **Latency**: Low encoding latency (<10ms)
- **Browser Support**: Native in all modern browsers

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     ELECTRON MAIN PROCESS                   │
│  - Window Lifecycle (create, show, hide)                   │
│  - Global Shortcut Registration (Ctrl+Shift+Space)         │
│  - System Tray Management                                  │
└────────────────────┬────────────────────────────────────────┘
                     │ IPC / Window Loading
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  RENDERER PROCESS (Browser)                 │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              NEXT.JS APPLICATION                      │ │
│  │                                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │           UI LAYER (page.tsx)                   │ │ │
│  │  │  - Mode Selection (note/formatted/actions)      │ │ │
│  │  │  - Record/Stop Controls                         │ │ │
│  │  │  - Status Display                               │ │ │
│  │  │  - Results View                                 │ │ │
│  │  │  - Audio Level Meter (Canvas)                   │ │ │
│  │  └─────────────┬───────────────────────────────────┘ │ │
│  │                │                                       │ │
│  │                ▼                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │       AUDIO CAPTURE LAYER                       │ │ │
│  │  │  - MediaRecorder API                            │ │ │
│  │  │  - Format Negotiation (Opus/WebM/OGG)          │ │ │
│  │  │  - AudioContext (Level Metering)                │ │ │
│  │  │  - Stream Management                            │ │ │
│  │  └─────────────┬───────────────────────────────────┘ │ │
│  │                │ Blob (audio data)                    │ │
│  │                ▼                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │       API LAYER (/api/transcribe)               │ │ │
│  │  │                                                 │ │ │
│  │  │  ┌───────────────────────────────────────────┐ │ │ │
│  │  │  │   TRANSCRIPTION ORCHESTRATOR              │ │ │ │
│  │  │  │  - Provider Selection (Groq/OpenAI/Mock)  │ │ │ │
│  │  │  │  - API Communication                      │ │ │ │
│  │  │  │  - Error Handling & Fallback              │ │ │ │
│  │  │  └───────────┬───────────────────────────────┘ │ │ │
│  │  │              │ transcript (string)              │ │ │
│  │  │              ▼                                   │ │ │
│  │  │  ┌───────────────────────────────────────────┐ │ │ │
│  │  │  │      ENRICHMENT ENGINE                    │ │ │ │
│  │  │  │                                           │ │ │ │
│  │  │  │  Mode: "note"      → bulletsFromTranscript│ │ │ │
│  │  │  │  Mode: "formatted" → paragraphsFrom...    │ │ │ │
│  │  │  │  Mode: "actions"   → actionsFrom...       │ │ │ │
│  │  │  └───────────┬───────────────────────────────┘ │ │ │
│  │  │              │ outputs (structured)             │ │ │
│  │  │              ▼                                   │ │ │
│  │  │  ┌───────────────────────────────────────────┐ │ │ │
│  │  │  │   RESPONSE BUILDER                        │ │ │ │
│  │  │  │  - Structured JSON response               │ │ │ │
│  │  │  │  - Metadata (provider, duration, etc.)    │ │ │ │
│  │  │  └───────────────────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Electron Main Process

**File:** `electron-main.cjs`

**Responsibilities:**
- Create and manage browser window
- Register global keyboard shortcut (`Ctrl+Shift+Space`)
- Handle window visibility toggle
- Load Next.js UI (`http://localhost:3000` in dev)

**Code Highlights:**
```javascript
const { app, BrowserWindow, globalShortcut } = require("electron");

function createWindow() {
  win = new BrowserWindow({
    width: 480,
    height: 360,
    show: false,           // Start hidden
    alwaysOnTop: true,     // Float above other windows
    webPreferences: {
      contextIsolation: true,
    },
  });
  
  win.loadURL("http://localhost:3000");
}

app.whenReady().then(() => {
  createWindow();
  
  globalShortcut.register("Control+Shift+Space", () => {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });
});
```

**Design Notes:**
- Window starts hidden to prevent flash on startup
- `alwaysOnTop` ensures quick access when toggled
- Global shortcut works even when app is hidden

---

### 2. UI Layer (React Components)

**File:** `app/app/page.tsx`

**State Management:**
```typescript
const [mode, setMode] = useState<Mode>("note");
const [isRecording, setIsRecording] = useState(false);
const [status, setStatus] = useState<string>("bereit");
const [error, setError] = useState<string | null>(null);
const [transcript, setTranscript] = useState<string>("");
const [result, setResult] = useState<ApiResponse | null>(null);
```

**Key Features:**
1. **Mode Selection**: Dropdown for note/formatted/actions
2. **Recording Controls**: Record/Stop buttons
3. **Status Display**: Visual feedback (bereit → aufnehmen → verarbeiten → fertig)
4. **Audio Level Meter**: Canvas-based RMS visualization
5. **Results Display**: Mode-specific rendering
6. **Copy Button**: Clipboard integration

**Component Lifecycle:**
```
Mount
  ↓
Check browser capabilities (canRecord)
  ↓
Idle State (waiting for user)
  ↓
[User clicks Record]
  ↓
Request microphone access
  ↓
Start MediaRecorder + Level Meter
  ↓
Recording State
  ↓
[User clicks Stop]
  ↓
Stop recording, create audio blob
  ↓
Upload to API
  ↓
Display results + copy to clipboard
  ↓
Complete State
  ↓
[Auto-reset or manual reset]
  ↓
Back to Idle
```

---

### 3. Audio Capture Layer

**Technologies:**
- `navigator.mediaDevices.getUserMedia()` - Microphone access
- `MediaRecorder` - Audio encoding
- `AudioContext` + `AnalyserNode` - Level metering

**Format Negotiation:**
```typescript
const mimeCandidates = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];
const mimeType = mimeCandidates.find((m) => 
  MediaRecorder.isTypeSupported(m)) || "";
```

**Audio Constraints:**
```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,    // Remove echo
    noiseSuppression: true,    // Remove background noise
    autoGainControl: true,     // Normalize volume
  },
});
```

**Level Meter Implementation:**
```typescript
function startLevelMeter(stream: MediaStream) {
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.85;
  
  // Calculate RMS (Root Mean Square) level
  const data = new Uint8Array(analyser.fftSize);
  
  function draw() {
    analyser.getByteTimeDomainData(data);
    
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    const level = Math.min(1, Math.max(0, rms * 2.2)); // Boost for speech
    
    // Draw to canvas
    canvas.fillRect(0, 0, level * width, height);
    requestAnimationFrame(draw);
  }
  
  draw();
}
```

**Why RMS?**
- More accurate than peak detection for speech
- Smooth, less jittery than raw amplitude
- Represents perceived loudness better

---

### 4. API Layer

**File:** `app/app/api/transcribe/route.ts`

**Request Flow:**
```
POST /api/transcribe
  ↓
Parse FormData
  - audio: File (Blob)
  - mode: "note" | "formatted" | "actions"
  - durationMs: number
  - mimeType: string
  ↓
Transcription
  - Try Groq if GROQ_API_KEY set
  - Else try OpenAI if OPENAI_API_KEY set
  - Else return mock transcript
  ↓
Enrichment (based on mode)
  - bulletsFromTranscript()
  - paragraphsFromTranscript()
  - actionsFromTranscript()
  ↓
Build Response
  - transcript (string)
  - outputs (note/formatted/actions)
  - meta (provider, duration, warnings)
  ↓
Return JSON
```

**Provider Selection Logic:**
```typescript
async function transcribe(audioFile: File): Promise<TranscribeResult> {
  if (process.env.GROQ_API_KEY) {
    return transcribeWithGroq(audioFile);
  }
  if (process.env.OPENAI_API_KEY) {
    return transcribeWithOpenAI(audioFile);
  }
  
  // Fallback: Mock transcript
  return {
    transcript: "Mock-Transkript: (kein API-Key konfiguriert) ...",
    provider: "mock",
    warning: "No API keys set; returning mock transcript",
  };
}
```

**Error Handling Strategy:**
```typescript
try {
  const resp = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {...});
  if (!resp.ok) {
    // Graceful fallback to mock
    return {
      transcript: "Mock-Transkript: (Groq STT Error) ...",
      provider: "mock",
      warning: `Groq STT failed: ${resp.status}`,
    };
  }
  return { transcript: data.text, provider: "groq_whisper" };
} catch (err) {
  // Network error → mock fallback
  return { transcript: "Mock...", provider: "mock", warning: err.message };
}
```

**Why This Approach?**
- ✅ Never throws unhandled errors
- ✅ Always returns a usable response
- ✅ Clear warnings visible to user
- ✅ Testable without API keys

---

## Data Flow

### Complete Request Flow

```
┌────────────────┐
│  User Action   │ Press Ctrl+Shift+Space or click Record
└───────┬────────┘
        │
        ▼
┌────────────────────────────────────────┐
│  UI State Change                       │
│  - isRecording = true                  │
│  - status = "aufnehmen"                │
└───────┬────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────┐
│  Audio Capture                         │
│  - getUserMedia() → MediaStream        │
│  - MediaRecorder.start()               │
│  - Level Meter starts                  │
└───────┬────────────────────────────────┘
        │
        │ User speaks (audio chunks collected)
        │
        ▼
┌────────────────────────────────────────┐
│  Stop Recording                        │
│  - MediaRecorder.stop()                │
│  - Level Meter stops                   │
│  - Create Blob from chunks             │
└───────┬────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────┐
│  HTTP Request                          │
│  POST /api/transcribe                  │
│  FormData:                             │
│    - audio: Blob                       │
│    - mode: "note" | "formatted" | ...  │
│    - durationMs: 5420                  │
│    - mimeType: "audio/webm"            │
└───────┬────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────┐
│  API: Transcription                    │
│  if (GROQ_API_KEY):                    │
│    → Groq Whisper API                  │
│  else if (OPENAI_API_KEY):             │
│    → OpenAI Whisper API                │
│  else:                                 │
│    → Mock Transcript                   │
│                                        │
│  Result: transcript (string)           │
└───────┬────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────┐
│  API: Enrichment                       │
│                                        │
│  if (mode === "note"):                 │
│    → bulletsFromTranscript()           │
│    → ["Punkt 1", "Punkt 2", ...]       │
│                                        │
│  if (mode === "formatted"):            │
│    → paragraphsFromTranscript()        │
│    → "Para 1\n\nPara 2\n\n..."         │
│                                        │
│  if (mode === "actions"):              │
│    → actionsFromTranscript()           │
│    → [{action, due, confidence}, ...]  │
└───────┬────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────┐
│  API Response                          │
│  {                                     │
│    ok: true,                           │
│    transcript: "...",                  │
│    outputs: {                          │
│      note: {...},                      │
│      formatted: {...},                 │
│      actions: {...}                    │
│    },                                  │
│    meta: {                             │
│      provider: "groq_whisper",         │
│      durationMs: 5420,                 │
│      warning: null                     │
│    }                                   │
│  }                                     │
└───────┬────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────┐
│  UI Update                             │
│  - setResult(json)                     │
│  - setTranscript(json.transcript)      │
│  - setStatus("fertig")                 │
│  - Render mode-specific output         │
│  - Copy to clipboard                   │
└────────────────────────────────────────┘
```

---

## State Management

### UI State Machine

```
┌──────────┐
│   IDLE   │ Initial state, waiting for user
└─────┬────┘
      │ startRecording()
      ▼
┌──────────┐
│RECORDING │ Microphone active, capturing audio
└─────┬────┘
      │ stopRecording()
      ▼
┌──────────────┐
│ TRANSCRIBING │ Uploading audio, waiting for API
└─────┬────────┘
      │ API returns transcript
      ▼
┌──────────┐
│ENRICHING │ Processing transcript into mode-specific output
└─────┬────┘
      │ Enrichment complete
      ▼
┌──────────┐
│ COMPLETE │ Results displayed, copied to clipboard
└─────┬────┘
      │ Auto-reset or manual reset
      └────────► Back to IDLE

ERROR at any stage → IDLE (with error message displayed)
```

### State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `mode` | `"note" \| "formatted" \| "actions"` | Selected enrichment mode |
| `isRecording` | `boolean` | Recording in progress |
| `status` | `string` | User-facing status message |
| `error` | `string \| null` | Error message (if any) |
| `transcript` | `string` | Raw transcript from STT |
| `result` | `ApiResponse \| null` | Full API response |
| `audioProof` | `string` | Audio metadata (size, duration) |

### Refs (for performance)

| Ref | Type | Purpose |
|-----|------|---------|
| `mediaRecorderRef` | `MediaRecorder` | Avoid re-renders during recording |
| `chunksRef` | `BlobPart[]` | Accumulate audio chunks |
| `startedAtRef` | `number` | Recording start timestamp |
| `levelCanvasRef` | `HTMLCanvasElement` | Canvas element for level meter |
| `audioCtxRef` | `AudioContext` | Audio analysis context |
| `analyserRef` | `AnalyserNode` | Audio analyser node |
| `rafRef` | `number` | RequestAnimationFrame ID |

**Why Refs?**
- MediaRecorder shouldn't trigger re-renders
- Audio chunks don't need to be reactive
- Canvas manipulation is imperatives

---

## Audio Processing Pipeline

### 1. Microphone Access

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
});
```

**Browser Constraints:**
- User must grant permission
- HTTPS required (or localhost)
- Only one app can access mic at a time

---

### 2. Encoding

```typescript
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: "audio/webm;codecs=opus"
});

mediaRecorder.ondataavailable = (e) => {
  if (e.data.size > 0) {
    chunksRef.current.push(e.data);
  }
};

mediaRecorder.start(); // No timeslice = single blob on stop
```

**Encoding Process:**
- Audio frames → Opus encoder
- Opus frames → WebM container
- Chunks emitted on `stop()`

**Typical Sizes:**
- 1 minute speech ≈ 90 KB (at 12 kbps)
- 5 minutes ≈ 450 KB
- Very efficient for speech

---

### 3. Level Metering

**Purpose:** Visual feedback that mic is working

**Implementation:**
```typescript
// Create audio graph
const source = audioCtx.createMediaStreamSource(stream);
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 1024;
source.connect(analyser);

// Read time-domain data
const data = new Uint8Array(analyser.fftSize);
analyser.getByteTimeDomainData(data);

// Calculate RMS
let sum = 0;
for (let i = 0; i < data.length; i++) {
  const v = (data[i] - 128) / 128; // Normalize to [-1, 1]
  sum += v * v;
}
const rms = Math.sqrt(sum / data.length);

// Scale for speech (boost quiet signals)
const level = Math.min(1, Math.max(0, rms * 2.2));
```

**Why This Works:**
- Time-domain data shows waveform amplitude
- RMS averages out noise/silence
- Boosting by 2.2x makes typical speech visible
- Clamped to [0, 1] for drawing

---

## Enrichment Engine

### Design Philosophy

**Heuristic vs LLM:**

| Approach | Heuristic (Current) | LLM (Alternative) |
|----------|---------------------|-------------------|
| **Accuracy** | Deterministic | Probabilistic |
| **Hallucinations** | None | Possible |
| **Speed** | Instant | 2-5 seconds |
| **Cost** | Free | ~$0.01-0.03/call |
| **Transparency** | Fully transparent | Black box |
| **Extensibility** | Limited by rules | Very flexible |

**Decision:** Heuristics for MVP. LLM can be added later without changing UI/API contract.

---

### Mode 1: "note" (Bullet Points)

**Algorithm:**
```typescript
function bulletsFromTranscript(t: string): string[] {
  // 1. Normalize text (remove extra whitespace, newlines)
  const text = normalizeText(t);
  
  // 2. Split into sentences
  const sentences = text.split(/(?<=[.!?])\s+/g);
  
  // 3. Process each sentence
  const bullets: string[] = [];
  for (const s of sentences) {
    if (s.length <= 140) {
      // Short sentence → single bullet
      bullets.push(s);
    } else {
      // Long sentence → split on conjunctions/commas
      const parts = s.split(/\s+(?:und|außerdem|dann)\s+|,\s+/gi);
      bullets.push(...parts);
    }
  }
  
  // 4. Limit to 25 bullets (prevent overwhelming output)
  return bullets.slice(0, 25);
}
```

**Example:**
```
Input: "Ich muss heute einkaufen gehen und dann die Wäsche machen. 
        Außerdem sollte ich den Hund füttern."

Output:
- Ich muss heute einkaufen gehen
- dann die Wäsche machen
- Außerdem sollte ich den Hund füttern
```

**Strengths:**
- Preserves original wording
- No interpretation
- Fast (< 1ms)

---

### Mode 2: "formatted" (Readable Text)

**Algorithm:**
```typescript
function paragraphsFromTranscript(t: string): string[] {
  const sentences = splitSentences(t);
  
  const paragraphs: string[] = [];
  
  // Group sentences into paragraphs (2 sentences each)
  for (let i = 0; i < sentences.length; i += 2) {
    const chunk = sentences.slice(i, i + 2).join(" ").trim();
    if (chunk) paragraphs.push(chunk);
  }
  
  return paragraphs.slice(0, 8); // Max 8 paragraphs
}
```

**Output Format:**
```markdown
# Notiz

Paragraph 1 with two sentences combined.

Paragraph 2 with two more sentences.

...
```

**Why 2 Sentences per Paragraph?**
- Avoids wall of text
- Not too fragmented (vs 1 sentence each)
- Readable without being overwhelming

---

### Mode 3: "actions" (Task Extraction)

**Algorithm:**
```typescript
function actionsFromTranscript(t: string): Array<{
  action: string;
  due: string;
  confidence: number;
}> {
  const sentences = splitSentences(t);
  
  // 1. Filter sentences with action triggers
  const trigger = /(muss|müssen|soll|sollte|bitte|mach\b|kannst du|
                    organisieren|klären|besorgen|holen|kaufen|...)/i;
  
  const items: Array<...> = [];
  
  for (const s of sentences) {
    if (!trigger.test(s)) continue; // Skip non-action sentences
    
    // 2. Convert to action phrase
    const { action, confidence } = toActionPhrase(s);
    
    // 3. Extract temporal info
    const due = extractDue(s); // "heute", "morgen", "nächste Woche"
    
    // 4. Tag with area (Finanzen, Reise, etc.)
    const area = areaTag(action);
    const labeled = area !== "Allgemein" ? `[${area}] ${action}` : action;
    
    items.push({ action: labeled, due, confidence, _area: area });
  }
  
  // 5. Deduplicate
  const dedup = deduplicateActions(items);
  
  // 6. Sort by area, then confidence
  dedup.sort((a, b) => {
    if (a._area !== b._area) return a._area.localeCompare(b._area);
    return b.confidence - a.confidence;
  });
  
  return dedup.slice(0, 20); // Max 20 actions
}
```

**Action Phrase Normalization:**
```typescript
function toActionPhrase(sentence: string): { action: string; confidence: number } {
  let s = sentence.trim();
  
  // Remove soft fillers
  s = s.replace(/^(okay|ok|also|ähm|hm|ja)\b[,:]?\s*/i, "");
  
  // Detect strong imperative markers
  const strong = /(wir müssen|ich muss|sollten wir|bitte|mach|kannst du)/i.test(s);
  
  // Normalize to imperative-ish form
  s = s
    .replace(/^wir müssen\s+/i, "")
    .replace(/^ich muss\s+/i, "")
    .replace(/^wir sollten\s+/i, "")
    .replace(/^bitte\s+/i, "");
  
  // Capitalize first letter
  s = s[0].toUpperCase() + s.slice(1);
  
  return {
    action: s,
    confidence: strong ? 0.75 : 0.6, // Strong markers = higher confidence
  };
}
```

**Due Date Extraction:**
```typescript
function extractDue(text: string): string {
  const s = text.toLowerCase();
  
  if (s.includes("heute")) return "heute";
  if (s.includes("morgen")) return "morgen";
  if (s.includes("diese woche")) return "diese Woche";
  if (s.includes("nächste woche")) return "nächste Woche";
  
  return "später"; // Default for unspecified
}
```

**Area Tagging:**
```typescript
function areaTag(text: string): string {
  const s = text.toLowerCase();
  
  if (/(bank|geld|konto|überweis|bezahlen)/.test(s)) return "Finanzen";
  if (/(einkauf|kaufen|besorgen|holen)/.test(s)) return "Haushalt";
  if (/(urlaub|reise|buchen|hotel|flug)/.test(s)) return "Reise";
  if (/(tier|hund|katze|füttern)/.test(s)) return "Tiere";
  if (/(arbeit|projekt|repo|code)/.test(s)) return "Projekt";
  
  return "Allgemein";
}
```

**Example:**
```
Input: "Ich muss heute zur Bank gehen und Geld abheben. 
        Außerdem sollte ich morgen den Hund füttern."

Output:
[
  {
    action: "[Finanzen] Zur Bank gehen und Geld abheben",
    due: "heute",
    confidence: 0.75  // "muss" = strong
  },
  {
    action: "[Tiere] Den Hund füttern",
    due: "morgen",
    confidence: 0.6   // "sollte" = weaker
  }
]
```

**Confidence Scores:**
- **0.75**: Strong imperative ("muss", "bitte", "mach")
- **0.60**: Weaker imperative ("sollte", "könnte")

**Why Confidence Matters:**
- Honest about uncertainty
- User can prioritize high-confidence items
- No false precision (not "due: 2026-02-05 14:30")

---

## Design Decisions

### 1. Why Electron instead of Tauri?

**Factors Considered:**

| Factor | Electron | Tauri |
|--------|----------|-------|
| Bundle Size | ~100 MB | ~3-5 MB |
| Memory | ~150 MB | ~50 MB |
| Startup Time | ~2-3 sec | ~0.5 sec |
| Ecosystem | Huge | Growing |
| Maturity | 7+ years | 2-3 years |
| Documentation | Extensive | Good |
| Global Shortcuts | Mature | Mature |
| Next.js Integration | Seamless | Requires config |
| Dev Speed | Fast | Moderate |

**Decision:** Electron

**Rationale:**
- Challenge timeline: 2-3 days
- Electron = faster development (familiar, well-documented)
- Bundle size acceptable for desktop app
- Reliability > optimization for MVP

**Future Consideration:**
- For production/V2, migrate to Tauri for smaller bundles
- Estimated effort: 1-2 days (architecture is modular)

---

### 2. Why Heuristic Enrichment instead of LLM?

**Comparison:**

| Aspect | Heuristics | LLM (GPT-4) |
|--------|------------|-------------|
| Speed | < 1 ms | 2-5 seconds |
| Cost | Free | ~$0.01-0.03/call |
| Accuracy | Rule-based | Context-aware |
| Hallucinations | None | Possible |
| Transparency | Fully transparent | Black box |
| Determinism | Same input → same output | Probabilistic |
| Offline | Works offline | Requires API |

**Decision:** Heuristics for MVP

**Rationale:**
1. **No Hallucinations**: LLMs can invent TODOs not mentioned
2. **Transparency**: Users can understand how it works
3. **Speed**: Instant results (no API latency)
4. **Cost**: Zero per-use cost
5. **Reliability**: Deterministic, no API failures

**When to Use LLM:**
- Complex restructuring (e.g., "write as email")
- Summarization of long content
- Stylistic transformation (e.g., "make formal")

**Hybrid Approach (Future):**
- Use heuristics for structure extraction
- Use LLM for final polishing (optional)
- User toggle: "Quick" vs "AI-Enhanced"

---

### 3. Why Multi-Provider (Groq/OpenAI/Mock)?

**Benefits:**
1. **Flexibility**: User can choose based on cost/speed
2. **Reliability**: Fallback if one provider fails
3. **Development**: Mock enables testing without API keys
4. **Migration**: Easy to add new providers (Anthropic, local Whisper)

**Implementation:**
```typescript
if (process.env.GROQ_API_KEY) return transcribeWithGroq(audioFile);
if (process.env.OPENAI_API_KEY) return transcribeWithOpenAI(audioFile);
return mockTranscript();
```

**Provider Priority:**
1. **Groq** (if key set) - Fastest, generous free tier
2. **OpenAI** (if key set) - Industry standard
3. **Mock** (always available) - For testing

---

### 4. Why Three Modes?

**Problem:** Same input, different intents

**Example:**
```
Spoken: "Wir müssen diese Woche das Projekt finalisieren und die 
         Präsentation vorbereiten. Außerdem sollte ich mit dem Team 
         die nächsten Schritte besprechen."
```

**Mode 1 (note):** Quick capture
```
- Wir müssen diese Woche das Projekt finalisieren
- die Präsentation vorbereiten
- Außerdem sollte ich mit dem Team die nächsten Schritte besprechen
```

**Mode 2 (formatted):** Readable text
```
# Notiz

Wir müssen diese Woche das Projekt finalisieren und die Präsentation vorbereiten.

Außerdem sollte ich mit dem Team die nächsten Schritte besprechen.
```

**Mode 3 (actions):** Actionable tasks
```
[Projekt] Projekt finalisieren
due: diese Woche · confidence: 75%

[Projekt] Präsentation vorbereiten
due: diese Woche · confidence: 75%

[Projekt] Mit dem Team die nächsten Schritte besprechen
due: später · confidence: 60%
```

**Why This Matters:**
- Respects user intent
- No "one-size-fits-all" AI magic
- Clear expectations = better UX

---

## Error Handling

### Strategy: Graceful Degradation

**Principle:** Never throw unhandled errors. Always provide usable output.

### Error Categories

#### 1. User Errors
- No microphone permission
- No API key configured
- Browser doesn't support MediaRecorder

**Handling:**
```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
} catch (err) {
  if (err.name === "NotAllowedError") {
    setError("Mikrofon-Zugriff verweigert. Erlaube das Mikrofon für die App.");
  } else {
    setError(`getUserMedia-Fehler: ${err.message}`);
  }
  setStatus("Fehler");
}
```

**UX:** Clear, actionable error messages

---

#### 2. Network Errors
- API timeout
- No internet connection
- Rate limiting

**Handling:**
```typescript
try {
  const resp = await fetch(GROQ_API_URL, {...});
  if (!resp.ok) {
    return {
      transcript: "Mock-Transkript: (Groq API Error) ...",
      provider: "mock",
      warning: `Groq API failed: ${resp.status}`,
    };
  }
} catch (err) {
  return {
    transcript: "Mock-Transkript: (Network Error) ...",
    provider: "mock",
    warning: err.message,
  };
}
```

**UX:** Fallback to mock, warn user, continue functioning

---

#### 3. Processing Errors
- Empty transcript from API
- Invalid audio format
- Unexpected API response

**Handling:**
```typescript
const data = await resp.json();
const transcript = (data?.text || "").trim();

if (!transcript) {
  return {
    transcript: "Mock-Transkript: (Empty response) ...",
    provider: "mock",
    warning: "API returned empty transcript",
  };
}
```

**UX:** Always return valid structure, even if content is placeholder

---

### Error Display

```typescript
{error && (
  <div style={{
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    background: "#fff5f5",
    border: "1px solid #ffd0d0",
  }}>
    <b>Fehler:</b> {error}
  </div>
)}
```

**Design:**
- Red background (but not too aggressive)
- Clear "Fehler:" label
- Specific error message
- Doesn't block UI (can still reset/retry)

---

## Performance Considerations

### Audio Pipeline
- **No buffering**: Chunks only created on `stop()`
- **Canvas RAF**: RequestAnimationFrame for smooth 60fps meter
- **Cleanup**: Always disconnect AudioContext, stop streams

### React Optimization
- **useRef**: For MediaRecorder, chunks, timers (avoid re-renders)
- **useMemo**: For computed values (outputView, canRecord)
- **Minimal state**: Only update when necessary

### API
- **Streaming**: Not implemented (transcription is batch-only)
- **Compression**: Opus codec ~12 kbps (very small)
- **Parallel**: Enrichment runs synchronously (fast enough < 1ms)

### Bundle Size
- **Electron**: ~100 MB (acceptable for desktop)
- **Next.js**: Static export (no Node.js runtime)
- **Dependencies**: Minimal (only Next.js + React)

---

## Security

### API Keys
**Current:** Stored in `.env.local` (server-side only)

**Access:**
- Never exposed to client
- Only used in API routes (server-side)
- Not included in static build

**Future:**
- Encrypt at rest
- Use OS keychain (macOS Keychain, Windows Credential Manager)

---

### Microphone Access
- **Permission required**: Browser prompt
- **HTTPS only**: (or localhost in dev)
- **User control**: Can revoke in browser settings

---

### Data Privacy
- **No storage**: Audio not saved to disk
- **No logging**: Audio not logged
- **API privacy**: See provider policies (Groq, OpenAI)

---

## Future Extensions

### Short-term (V1.1-1.2)

1. **Offline Mode**
   - Integrate `whisper.cpp` (local C++ port)
   - ~500 MB model download
   - Slower (3-5x) but private

2. **Additional Enrichment Modes**
   - "email" → Draft email format
   - "meeting-notes" → Structured meeting notes
   - "code-comment" → Format as code comments

3. **History**
   - SQLite database
   - Search past transcripts
   - Re-process with different modes

### Long-term (V2.0+)

4. **Streaming Transcription**
   - Real-time as you speak
   - Show partial results
   - Requires WebSocket or SSE

5. **LLM Integration (Optional)**
   - Toggle: "Quick" vs "AI-Enhanced"
   - Use LLM for final polishing
   - Keep heuristics as base

6. **Multi-language**
   - Auto-detect language
   - Language-specific enrichment rules

7. **Cloud Sync**
   - Sync history across devices
   - End-to-end encryption

---

## Conclusion

Voice Intelligence Desktop demonstrates a pragmatic approach to context-aware voice capture:

**Key Innovations:**
1. **Explicit Modes**: User intent drives processing (not generic AI)
2. **Heuristic Enrichment**: Transparent, no hallucinations
3. **Graceful Fallback**: Always usable, even without API keys
4. **Developer Experience**: Testable, modular, well-documented

**Architecture Strengths:**
- Clear separation of concerns (UI/API/Logic)
- Modular provider system
- Robust error handling
- Performance-optimized

**Production Readiness:**
- MVP: ✅ Ready
- Scale: Needs streaming for long recordings
- Security: API key storage needs upgrade
- Performance: Excellent for target use case (< 5 min recordings)

This architecture supports the current feature set while remaining extensible for future enhancements.



---

## Design Decision: Electron vs. Tauri

Electron was chosen over alternatives such as Tauri to prioritize development speed, mature tooling, and predictable cross-platform behavior—especially on Windows. Seamless integration with an existing Next.js stack and global hotkey handling were decisive factors. The larger bundle size compared to Tauri was considered acceptable within the scope of this challenge.

## Current Scope Limitations

- Audio recording is handled in-memory and intended for short-form usage (minutes rather than hours).
- Long meeting transcription would require chunked recording and streaming-based transcription APIs.
- These aspects were consciously excluded to keep the prototype focused and reviewable.

## Privacy & Security Considerations

- Audio data is processed transiently and not persisted beyond the active session.
- No user data is stored locally or remotely by default.
- API keys are provided via environment variables and are never committed to the repository.
