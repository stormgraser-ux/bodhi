# Bodhi — Handoff Document

## Current State (v0.2.0)

All core development is complete. The app is deployed and distributed:

- **Desktop app** — macOS (universal) + Windows installers on [GitHub Releases](https://github.com/stormgraser-ux/bodhi/releases)
- **Phone PWA** — Live at [stormgraser-ux.github.io/bodhi](https://stormgraser-ux.github.io/bodhi/)
- **WiFi sync** — Desktop runs embedded sync server, phone syncs over LAN
- **Auto-updater** — Desktop checks GitHub Releases for updates (user-initiated via shield panel)

## What Was Built

### Phase 1: Foundation
- Note CRUD with auto-save (1s debounce)
- TipTap rich-text editor with markdown storage
- Tags with autocomplete, search with tag filter (AND logic)
- Privacy panel with verification steps
- CSP lockdown blocking all external connections
- SQLite persistence (Tauri desktop)

### Phase 1.5: PWA
- IndexedDB storage backend for browser/phone
- Storage abstraction layer (SQLite or IndexedDB, same API)
- Mobile-responsive layout (768px breakpoint, list-or-editor toggle)
- Service worker for offline support
- iOS safe-area insets, 16px input font (prevents auto-zoom)

### Phase 2: Design
- Temple Garden theme (aged paper, moss green, burgundy, gold leaf)
- Enso circle loading animation
- Bodhi leaf icons, mindful language throughout
- Note presets (Daily Reflection, Gratitude Practice, Walking Meditation, etc.)
- Focus mode (press F on desktop to hide sidebar)

### Phase 3: Sync
- Automerge CRDT per note (conflict-free merging)
- Axum HTTP server embedded in Tauri (port 8108)
- Phone pairing: enter desktop IP, validated as private range
- QR code display on desktop (zero-dependency SVG generator)
- Delta sync protocol with deletion tombstones
- Manual sync (button press) — no auto-sync
- Sync PWA bundled in desktop app for same-origin access

### Distribution
- GitHub Actions: PWA auto-deploys on push to master
- GitHub Actions: Desktop builds on version tag push
- Tauri updater with `latest.json` for in-app updates
- Signing key configured for update verification

## Tech Stack

| Layer | Choice |
|-------|--------|
| Desktop shell | Tauri v2 (Rust backend) |
| Frontend | React 19 + TypeScript + Vite |
| Package manager | pnpm |
| Desktop DB | tauri-plugin-sql (SQLite) |
| Phone DB | IndexedDB (via `idb`) |
| CRDT | Automerge (JS + Rust) |
| Sync server | axum + rusqlite + tower-http |
| Editor | TipTap (@tiptap/react + tiptap-markdown) |
| Fonts | System font stack (zero external requests) |

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/db.ts` | Storage router (SQLite or IndexedDB) |
| `src/lib/db-sqlite.ts` | Tauri SQLite backend with CRDT |
| `src/lib/db-indexeddb.ts` | PWA IndexedDB backend with CRDT |
| `src/lib/crdt.ts` | Automerge CRDT wrapper |
| `src/lib/sync-client.ts` | HTTP sync client for phone |
| `src/lib/env.ts` | Platform detection flags |
| `src/lib/private-ip.ts` | Private IP validation |
| `src/lib/qr.ts` | QR code SVG generator |
| `src/components/PairingPanel.tsx` | Desktop QR/IP + Phone IP entry |
| `src/components/SyncButton.tsx` | Phone sync trigger |
| `src-tauri/src/sync_server.rs` | Axum sync server + PWA serving |
| `src-tauri/src/lib.rs` | Tauri setup + migrations + server start |
| `.github/workflows/deploy-pwa.yml` | GitHub Pages deploy |
| `.github/workflows/release-desktop.yml` | Desktop release build |

## How to Develop

```bash
cd ~/workspace/projects/Bodhi
export PATH="$HOME/.cargo/bin:$PATH"
pnpm tauri dev          # Desktop app
pnpm dev:pwa            # PWA (browser, port 5173)
pnpm build              # TypeScript check + Vite build
pnpm test               # Privacy self-test (147 checks)
```

## What's Left (Phase 4 — Recipient's Responsibility)

### Encryption at Rest
- Notes are stored unencrypted on disk
- Could use SQLCipher for SQLite, Web Crypto API for IndexedDB
- Design decision: passphrase-based vs device-key-based

### App Store Submission
- Code is App Store-ready (no web dependencies, proper bundling)
- Needs Apple Developer account ($99/year) for Mac App Store
- Windows Store submission is free
- App icons and metadata already in place
