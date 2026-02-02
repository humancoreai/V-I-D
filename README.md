# Voice Intelligence Desktop App

> A context-aware desktop application for capturing spoken thoughts and transforming them into structured, usable outputs

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)](https://nextjs.org/)
[![Electron](https://img.shields.io/badge/Electron-40.1.0-blue)](https://www.electronjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Key Features](#key-features)
- [Enrichment Modes](#enrichment-modes)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [API Providers](#api-providers)
- [Development](#development)
- [Building for Production](#building-for-production)
- [Design Decisions](#design-decisions)
- [Limitations & Scope](#limitations--scope)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Voice Intelligence Desktop is a lightweight desktop application built with **Next.js** and **Electron** that captures voice input, transcribes it using state-of-the-art AI models, and enriches the output based on your intent.

Unlike traditional voice-to-text tools that produce raw, unstructured transcripts, this app **understands context** through three distinct processing modes, ensuring the output matches your actual needs.

**Built for:** Quick thoughts, meeting notes, task planning, and creative brainstorming

**Optimized for:** Short to medium recordings (30 seconds - 5 minutes)

---

## Installation (Kurz)

> Ziel: lokal starten, ohne Key im Repo zu hinterlassen. API-Keys gehören in `app/.env.local` (nicht committen).

```bash
# 1) Root installieren (Electron Shell)
npm install

# 2) App installieren (Next.js UI + API Route)
cd app
npm install

# 3) Optional: Transkription (Groq) aktivieren
#   Lege app/.env.local an und setze GROQ_API_KEY=...
#   (Datei ist in .gitignore und wird nicht committed.)

# 4) Start: zwei Terminals
# Terminal A (Next)
npm run dev

# Terminal B (Electron) – in neuem Terminal im Root
cd ..
npm run electron
```


## The Problem

### Raw Transcripts Are Not Usable

When you speak your thoughts aloud, a standard transcription service gives you a wall of text:

```
"So I think we need to finish the project this week and maybe prepare 
the presentation and also I should probably talk to the team about next 
steps and we really need to organize the budget meeting and..."
```

**The challenge:** Depending on your intent, you might need this as:
- **Quick notes** → Bullet points for later reference
- **Readable text** → Formatted paragraphs for documentation
- **Action items** → Structured TODO list with due dates

Most tools force you to manually reformat the transcript, or they apply generic "AI magic" that doesn't respect your specific intent.

---

## The Solution

### Context-Aware Enrichment Through Explicit Modes

Voice Intelligence Desktop provides **three distinct enrichment modes** that transform the same input differently based on what you're trying to accomplish:

```
Voice Input (same for all)
        ↓
   Transcription
        ↓
    ┌───┴───────────┬──────────────┐
    ▼               ▼              ▼
  MODE 1         MODE 2          MODE 3
  Notes        Formatted        Actions
```

This gives you **predictable, reliable outputs** tailored to your workflow.

---

## Key Features

### 🎙️ **Voice Recording**
- High-quality audio capture (Opus codec, ~12 kbps)
- Real-time level meter (visual confirmation mic is working)
- Browser-based MediaRecorder API (no external dependencies)
- Automatic format negotiation (WebM/Opus preferred)

### ⚡ **Global Hotkey**
- **`Ctrl + Shift + Space`** toggles the app from anywhere
- Works even when app is minimized or hidden
- Instant access without breaking focus
- Cross-platform (Windows, macOS, Linux)

### 🤖 **Intelligent Transcription**
- Multi-provider support: Groq Whisper, OpenAI Whisper
- Automatic fallback to mock transcript (for testing without API keys)
- German language optimized (extensible to other languages)
- Graceful error handling (never crashes, always recovers)

### 🎯 **Three Enrichment Modes**
1. **Capture Thoughts** → Bullet-point notes
2. **Produce Text** → Readable paragraphs
3. **Derive Actions** → Task list with confidence scores

### 📋 **Copy-Ready Output**
- Results automatically formatted for clipboard
- One-click copy to clipboard
- Paste directly into Slack, Notion, Obsidian, etc.
- Mode-specific formatting (bullets vs paragraphs vs task list)

### 🖥️ **Desktop-First Design**
- Always-on-top window for quick access
- Minimal, distraction-free UI
- Status indicators (recording, processing, complete)
- Error messages that guide you to solutions

---

## Enrichment Modes

### Mode 1: "Denken festhalten" (Capture Thoughts)

**Use Case:** Brainstorming, thinking out loud, rough planning

**Processing:**
- Splits transcript into concise bullet points
- Preserves original wording (minimal rewriting)
- Breaks long sentences at conjunctions ("und", "außerdem", "dann")
- Limits to 25 bullets (prevents overwhelming output)

**Example:**

**Input (spoken):**
```
"Ich muss heute einkaufen gehen und dann die Wäsche machen. 
Außerdem sollte ich den Hund füttern und vielleicht noch 
die E-Mails checken."
```

**Output:**
```
Stichpunkte

- Ich muss heute einkaufen gehen
- dann die Wäsche machen
- Außerdem sollte ich den Hund füttern
- vielleicht noch die E-Mails checken
```

**Why This Works:**
- Quick capture without interpretation
- Easy to scan and reference later
- Preserves your original language

---

### Mode 2: "Text produzieren" (Produce Text)

**Use Case:** Drafts, explanations, written summaries, documentation

**Processing:**
- Groups sentences into readable paragraphs (2 sentences each)
- Adds Markdown formatting
- Light structure (not excessive headers)
- Limits to 8 paragraphs (keeps output focused)

**Example:**

**Input (spoken):**
```
"Das Projekt läuft gut. Wir haben diese Woche die ersten Features 
fertiggestellt. Das Team ist motiviert. Die nächsten Schritte sind 
die Integration und Testing."
```

**Output:**
```markdown
# Notiz

Das Projekt läuft gut. Wir haben diese Woche die ersten Features fertiggestellt.

Das Team ist motiviert. Die nächsten Schritte sind die Integration und Testing.
```

**Why This Works:**
- Readable paragraphs (not a wall of text)
- Markdown-ready for copy/paste
- Professional enough for sharing

---

### Mode 3: "Handlungen ableiten" (Derive Actions)

**Use Case:** Planning, next steps, follow-ups, task extraction

**Processing:**
- Identifies action triggers ("muss", "soll", "bitte", etc.)
- Extracts temporal information ("heute", "morgen", "nächste Woche")
- Tags actions by area (Finanzen, Haushalt, Reise, Projekt, etc.)
- Assigns confidence scores (0.6 for weak, 0.75 for strong imperatives)
- Deduplicates and sorts by area and confidence

**Example:**

**Input (spoken):**
```
"Ich muss heute zur Bank gehen und Geld abheben. 
Außerdem sollte ich morgen den Hund füttern. 
Vielleicht könnte ich nächste Woche den Urlaub buchen."
```

**Output:**
```
[Finanzen] Zur Bank gehen und Geld abheben
due: heute · confidence: 75%

[Tiere] Den Hund füttern
due: morgen · confidence: 60%

[Reise] Den Urlaub buchen
due: nächste Woche · confidence: 60%
```

**Why This Works:**
- No hallucinations (only extracts what you actually said)
- Confidence scores show uncertainty honestly
- Area tags help with organization
- Temporal info extracted ("heute", "morgen")

---

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────┐
│       ELECTRON MAIN PROCESS             │
│  - Window lifecycle                     │
│  - Global hotkey (Ctrl+Shift+Space)     │
│  - System tray                          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│       RENDERER (Browser)                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   NEXT.JS UI (page.tsx)         │   │
│  │  - Mode selection               │   │
│  │  - Recording controls           │   │
│  │  - Audio level meter            │   │
│  │  - Results display              │   │
│  └─────────┬───────────────────────┘   │
│            │                             │
│  ┌─────────▼───────────────────────┐   │
│  │   AUDIO CAPTURE                 │   │
│  │  - MediaRecorder                │   │
│  │  - Format negotiation           │   │
│  │  - Level metering               │   │
│  └─────────┬───────────────────────┘   │
│            │ Blob (audio)                │
│  ┌─────────▼───────────────────────┐   │
│  │   API (/api/transcribe)         │   │
│  │                                 │   │
│  │  ┌──────────────────────────┐  │   │
│  │  │ Transcription            │  │   │
│  │  │ (Groq/OpenAI/Mock)       │  │   │
│  │  └────┬─────────────────────┘  │   │
│  │       │ transcript              │   │
│  │  ┌────▼─────────────────────┐  │   │
│  │  │ Enrichment Engine        │  │   │
│  │  │ - bulletsFromTranscript  │  │   │
│  │  │ - paragraphsFrom...      │  │   │
│  │  │ - actionsFrom...         │  │   │
│  │  └──────────────────────────┘  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

For detailed architecture documentation, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Technology Stack

### Desktop Runtime
- **Electron 40.1.0** - Cross-platform desktop shell
- **Why Electron?** Mature ecosystem, excellent Next.js integration, reliable global shortcuts
- **Trade-off:** Bundle size (~100MB) vs development speed and reliability

### Frontend
- **Next.js 16.1.6** (App Router) - React framework with static export
- **React 19** - Latest React features
- **TypeScript 5** - Type safety throughout

### Audio Processing
- **Browser MediaRecorder API** - Native audio capture
- **Opus Codec** - Optimal compression for speech (~12 kbps)
- **AudioContext + AnalyserNode** - Real-time level metering

### Transcription Providers
- **Groq Whisper Large v3** (Primary) - Fast, accurate, generous free tier
- **OpenAI Whisper v2** (Fallback) - Industry standard
- **Mock Provider** (Testing) - Works without API keys

### Styling
- **Tailwind CSS 4** - Utility-first CSS (configured but minimal use in MVP)
- **Inline Styles** - Current implementation (simple, functional)

---

## Installation

### Prerequisites

- **Node.js 18+** with npm
- **Operating System:** Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd voice-intel-desktop
```

### Step 2: Install Dependencies

```bash
# Root dependencies (Electron)
npm install

# App dependencies (Next.js)
cd app
npm install
cd ..
```

### Step 3: Configure API Keys (Optional)

Create `app/.env.local`:

```env
# Option 1: Use Groq (recommended - faster, free tier)
GROQ_API_KEY=gsk_...

# Option 2: Use OpenAI
OPENAI_API_KEY=sk-...

# Note: If no API key is set, app will use mock transcript for testing
```

**Getting API Keys:**
- **Groq:** [console.groq.com](https://console.groq.com) (Free tier available)
- **OpenAI:** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

## Usage

### Development Mode

**Terminal 1:** Start Next.js dev server
```bash
cd app
npm run dev
```
*Wait for "Ready" message (usually ~5 seconds)*

**Terminal 2:** Start Electron shell
```bash
# From project root
npm run electron
```

The app window will appear (or stay hidden - press `Ctrl+Shift+Space` to toggle).

---

### Quick Start Workflow

1. **Launch app** (see Development Mode above)
2. **Press `Ctrl + Shift + Space`** to show window
3. **Select mode:**
   - "Denken festhalten" for quick notes
   - "Text produzieren" for readable drafts
   - "Handlungen ableiten" for task lists
4. **Click "🎙️ Record"** (or press hotkey again)
5. **Speak your thoughts** (watch the level meter to confirm mic is working)
6. **Click "⏹️ Stop"**
7. **Wait ~3-5 seconds** for processing
8. **Results appear automatically** and are copied to clipboard
9. **Paste anywhere** (Ctrl/Cmd + V)

**Pro Tip:** Keep the app running in the background. Use `Ctrl+Shift+Space` whenever you need to capture a thought.

---

### Global Hotkey

**Keyboard Shortcut:** `Ctrl + Shift + Space` (Windows/Linux) or `Cmd + Shift + Space` (macOS)

**Behavior:**
- If app is hidden → Show and focus
- If app is visible → Hide

**Use Cases:**
- Capture quick thoughts without switching apps
- Take notes during meetings
- Record ideas while browsing
- Extract action items from brainstorming

---

## Configuration

### Environment Variables

Create `app/.env.local` to configure the app:

```env
# Transcription Provider (choose one or both for fallback)
GROQ_API_KEY=gsk_your_groq_key_here
OPENAI_API_KEY=sk-your_openai_key_here

# API Base URLs (optional, for custom endpoints)
GROQ_BASE_URL=https://api.groq.com/openai/v1
OPENAI_BASE_URL=https://api.openai.com/v1

# Model Selection (optional)
GROQ_WHISPER_MODEL=whisper-large-v3
OPENAI_WHISPER_MODEL=whisper-1
```

### Default Behavior

**If no API keys are set:**
- App will use mock transcript: `"Mock-Transkript: (kein API-Key konfiguriert) Kurze Sprachnotiz..."`
- Enrichment modes will still work (demonstrating functionality)
- Perfect for testing the UI and workflow without API costs

**Provider Priority:**
1. Groq (if `GROQ_API_KEY` is set) - Fastest
2. OpenAI (if `OPENAI_API_KEY` is set) - Standard
3. Mock (always available) - Testing fallback

---

## API Providers

### Groq (Recommended)

**Advantages:**
- ✅ **Speed:** 2-3x faster than OpenAI
- ✅ **Free tier:** Generous allowance for testing
- ✅ **Quality:** Whisper Large v3 (state-of-the-art)
- ✅ **Latency:** < 2 seconds for 30-second audio

**Costs:**
- Free tier: Sufficient for personal use
- Paid: Check [groq.com/pricing](https://groq.com/pricing)

**Model:** `whisper-large-v3`

---

### OpenAI

**Advantages:**
- ✅ **Reliability:** Industry standard, highly available
- ✅ **Quality:** Excellent accuracy across languages
- ✅ **Support:** Extensive documentation

**Costs:**
- $0.006 per minute of audio
- Example: 100 minutes = $0.60

**Model:** `whisper-1` (Whisper v2)

---

### Mock Provider

**When Used:**
- No API keys configured
- API request fails (network error, rate limit, etc.)

**Behavior:**
- Returns fixed transcript for testing
- Enrichment modes work normally
- Displays warning: "Mock-Transkript: (kein API-Key konfiguriert)"

**Purpose:**
- Development without API dependencies
- UI testing
- Workflow demonstration

---

## Development

### Project Structure

```
voice-intel-desktop/
├── app/                          # Next.js application
│   ├── app/                      # App router directory
│   │   ├── api/
│   │   │   └── transcribe/
│   │   │       └── route.ts      # Transcription API endpoint
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Main UI (recording, results)
│   │   └── globals.css           # Global styles
│   ├── public/                   # Static assets
│   ├── package.json              # Next.js dependencies
│   ├── tsconfig.json             # TypeScript config
│   └── .env.local                # API keys (create this)
├── electron-main.cjs             # Electron main process
├── package.json                  # Electron dependencies
├── README.md                     # This file
├── ARCHITECTURE.md               # Detailed architecture docs
└── DEVLOG.md                     # Development log
```

### Running Tests

Currently, the project does not include automated tests. To test functionality:

1. **Without API keys:**
   - Start app (see Usage)
   - Record audio
   - Verify mock transcript appears
   - Test all 3 modes

2. **With API keys:**
   - Add `GROQ_API_KEY` or `OPENAI_API_KEY` to `app/.env.local`
   - Record real audio
   - Verify transcription accuracy
   - Test enrichment modes

### Debugging

**Electron DevTools:**
- In development, DevTools open automatically
- Or: Press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS)

**Common Issues:**

**"Mikrofon-Zugriff verweigert"**
- Grant microphone permission in system settings
- macOS: System Preferences → Security & Privacy → Microphone
- Windows: Settings → Privacy → Microphone

**"GROQ_API_KEY fehlt"**
- Create `app/.env.local` with API key
- Restart Next.js dev server (`npm run dev` in `app/`)

**Window doesn't appear:**
- Press `Ctrl+Shift+Space` to toggle visibility
- Check if Electron process is running

---

## Building for Production

### Create Executable

```bash
# Install electron-builder (if not already installed)
npm install --save-dev electron-builder

# Build Next.js app
cd app
npm run build
cd ..

# Package Electron app
npx electron-builder --dir
```

**Output:**
- Windows: `dist/win-unpacked/` → `.exe`
- macOS: `dist/mac/` → `.app`
- Linux: `dist/linux-unpacked/` → Binary

### Distribution

For full installers (`.msi`, `.dmg`, `.deb`):

1. Add `electron-builder` configuration to `package.json`:

```json
{
  "build": {
    "appId": "com.yourcompany.voice-intelligence",
    "productName": "Voice Intelligence",
    "directories": {
      "output": "dist"
    },
    "files": [
      "app/out/**/*",
      "electron-main.cjs"
    ],
    "win": {
      "target": "nsis"
    },
    "mac": {
      "target": "dmg"
    },
    "linux": {
      "target": ["deb", "AppImage"]
    }
  }
}
```

2. Build:
```bash
npx electron-builder
```

---

## Design Decisions

### 1. Electron vs Tauri

**Decision:** Electron

**Rationale:**
- **Development Speed:** 2-3 day challenge timeline
- **Maturity:** 7+ years of production use, extensive documentation
- **Integration:** Seamless Next.js integration
- **Ecosystem:** Huge plugin ecosystem, well-tested patterns

**Trade-off:**
- Bundle size: ~100MB (Electron) vs ~3-5MB (Tauri)
- Acceptable for desktop app, prioritized reliability over optimization

**Future:** Consider Tauri migration for V2.0 (estimated 1-2 days effort)

---

### 2. Heuristic Enrichment vs LLM

**Decision:** Heuristic (rule-based) enrichment

**Why Not LLM (GPT-4, Claude, etc.)?**

| Aspect | Heuristics | LLM |
|--------|------------|-----|
| Speed | < 1ms | 2-5 sec |
| Cost | Free | $0.01-0.03/call |
| Hallucinations | None | Possible |
| Transparency | Fully transparent | Black box |
| Determinism | Same input → same output | Probabilistic |

**Rationale:**
- **No Hallucinations:** LLMs might invent TODOs you never mentioned
- **Transparency:** Users can understand how extraction works
- **Speed:** Instant results
- **Cost:** Zero per-use cost
- **Reliability:** Deterministic, no API failures

**When to Use LLM:**
- Complex summarization
- Stylistic transformation ("make formal", "write as email")
- Long content restructuring

**Future Hybrid Approach:**
- Use heuristics for structure extraction (current)
- Add optional LLM polishing step (V2.0)
- User toggle: "Quick" vs "AI-Enhanced"

---

### 3. Three Modes Instead of One

**Problem:** Same input, different intents

**Example:**
```
Spoken: "Wir müssen diese Woche das Projekt finalisieren..."
```

**Without modes:** Generic output (doesn't fit any use case perfectly)

**With modes:**
- **Mode 1 (note):** Quick bullets for later reference
- **Mode 2 (formatted):** Readable paragraphs for documentation
- **Mode 3 (actions):** Task list with due dates and confidence

**Why This Matters:**
- Respects user intent
- Predictable outputs
- No "one-size-fits-all" AI magic that tries to guess what you want

---

### 4. Mock Provider for Testing

**Decision:** Always provide usable output, even without API keys

**Benefits:**
1. **Development:** No API costs during development
2. **Testing:** UI can be tested without external dependencies
3. **Resilience:** App never "breaks" due to missing keys
4. **Onboarding:** New users can try the app immediately

**Implementation:**
```typescript
if (!GROQ_API_KEY && !OPENAI_API_KEY) {
  return mockTranscript();
}
```

---

## Limitations & Scope

### Intentional Limitations

**Optimized for:** Short to medium recordings (30 seconds - 5 minutes)

**Not optimized for:**
- ❌ Long meetings (1+ hours) → Would require chunked recording, streaming
- ❌ Multi-speaker scenarios → Would need speaker diarization
- ❌ Real-time transcription → Would need WebSocket/SSE streaming
- ❌ Persistent storage → Would need database integration

**Why these limits?**
- **Scope management:** Challenge timeline is 2-3 days
- **Reliability:** Current architecture is simple and robust
- **Use case:** Optimized for quick thought capture, not full meeting transcription

### Technical Constraints

**Audio Format:**
- Requires browser with MediaRecorder support (all modern browsers)
- WebM/Opus preferred, fallback to OGG

**Microphone:**
- Requires microphone permission
- Only one app can access mic at a time

**API Dependencies:**
- Transcription requires internet connection (unless using mock)
- Subject to provider rate limits

---

## Roadmap

### V1.1 (Short-term)

- [ ] **Offline Mode:** Integrate `whisper.cpp` for local transcription
- [ ] **History:** Save past recordings to SQLite database
- [ ] **Search:** Full-text search across history
- [ ] **Additional Modes:**
  - "Email" mode → Draft email format
  - "Meeting Notes" mode → Structured meeting format
  - "Code Comment" mode → Format as code comments

### V1.2 (Medium-term)

- [ ] **UI Improvements:**
  - Dark mode
  - Gradient design (Tailwind CSS)
  - Animations and transitions
  - Better error states
- [ ] **Export Options:**
  - Save as Markdown
  - Save as PDF
  - Export to Notion/Obsidian

### V2.0 (Long-term)

- [ ] **Streaming Transcription:** Real-time as you speak
- [ ] **LLM Integration (Optional):** Toggle for AI-enhanced mode
- [ ] **Multi-language Support:** Auto-detect and process multiple languages
- [ ] **Cloud Sync:** Sync history across devices (end-to-end encrypted)
- [ ] **Tauri Migration:** Reduce bundle size to ~3-5MB

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/amazing-feature`
3. **Commit your changes:** `git commit -m 'Add amazing feature'`
4. **Push to the branch:** `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style (TypeScript, functional components)
- Add comments for complex logic
- Test with and without API keys
- Update README if adding new features

---

## License

MIT License - see [LICENSE](LICENSE) file for details

**TL;DR:** Free to use, modify, and distribute. No warranty.

---

## Acknowledgments

- **OpenAI** for Whisper transcription model
- **Groq** for fast inference and generous free tier
- **Electron** team for desktop framework
- **Next.js** team for excellent React framework

---

## Support

**Issues:** Report bugs or request features via [GitHub Issues](https://github.com/yourusername/voice-intel-desktop/issues)

**Questions:** See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical documentation

---

## Demo Video

[Link to demo video] (Upload to YouTube/Loom and add link here)

**Video Highlights:**
- Global hotkey workflow
- All three enrichment modes
- Audio level meter
- Copy-to-clipboard functionality
- Error handling (no API key, no microphone)

---


