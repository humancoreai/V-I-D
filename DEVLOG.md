# DEVLOG



## 2026-01-31 — Phase 1: Scaffold & Desktop-Shell

- Created Next.js app in /app and verified dev server on localhost:3000

- Added Electron runtime (electron-main.cjs) to wrap the Next.js UI

- Implemented global hotkey toggle (Ctrl+Shift+Space) to show/hide the window

- Fixed Windows Script Host (.js) pitfalls by switching to .cjs entry



## 2026-01-31 — Phase 2: UI + Recording (MVP)

- Replaced landing page with overlay UI (Record/Stop, Mode 1–3, status, output area)

- Implemented MediaRecorder-based audio capture in renderer

- Added API stub endpoint /api/transcribe returning mock transcript + schema outputs (note/markdown/actions)



