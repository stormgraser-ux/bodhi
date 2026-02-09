# Bodhi — Handoff Document

## What Was Built (Phase 1 — Foundation)

A fully functional privacy-first desktop note-taking app using Tauri v2 + React + TypeScript.

### Features Implemented
- **Note CRUD** — Create, read, update, delete notes
- **Auto-save** — Title, body, and tags save automatically (1s debounce for text, on-blur for tags)
- **Markdown editor** — Live split preview using @uiw/react-md-editor
- **Tags** — Add/remove tags per note, tag autocomplete from existing tags, filter notes by tag
- **Search** — Full-text search across title and body, combines with tag filter (AND logic)
- **Privacy panel** — Shield icon opens modal explaining all privacy guarantees + self-verification steps
- **CSP lockdown** — Content Security Policy blocks ALL external network connections
- **SQLite persistence** — Notes survive app restarts, stored in local bodhi.db

### Privacy Proofs (Screenshot-able)
1. **DevTools Network tab** — zero external requests during full CRUD cycle
2. **Offline test** — disconnect internet, app works perfectly
3. **CSP block** — `fetch("https://example.com")` in console shows "Refused to connect"

## Tech Stack
| Layer | Choice |
|-------|--------|
| Desktop shell | Tauri v2 |
| Frontend | React 19 + TypeScript + Vite |
| Package manager | pnpm |
| Database | tauri-plugin-sql (SQLite) |
| State management | React useReducer |
| Markdown editor | @uiw/react-md-editor |
| Fonts | System font stack |

## Key Files
| File | Purpose |
|------|---------|
| `src/lib/db.ts` | All SQL queries in one file (designed for Phase 3 CRDT swap) |
| `src/hooks/useNotes.ts` | Note state management (CRUD + tags) |
| `src/hooks/useSearch.ts` | Search + tag filter logic |
| `src/App.tsx` | Main two-panel layout |
| `src/components/NoteEditor.tsx` | Markdown editor with auto-save |
| `src/components/TagInput.tsx` | Tag input with autocomplete + blur-save |
| `src/components/PrivacyPanel.tsx` | Privacy guarantees modal |
| `src-tauri/src/lib.rs` | Rust backend — plugin registration + DB migrations |
| `src-tauri/tauri.conf.json` | CSP lockdown + window config |
| `src-tauri/capabilities/default.json` | SQL plugin permissions |

## How to Run
```bash
cd ~/workspace/projects/Bodhi && pnpm tauri dev
```
First Rust build takes ~1.5 min. Subsequent builds are fast.

## Build Notes
- Rust must be on PATH: `export PATH="$HOME/.cargo/bin:$PATH"`
- `pnpm create tauri-app` / `pnpm tauri init` fail in non-TTY — project was scaffolded manually
- Tauri v2: `app.title` is NOT valid in config — title goes in window config only
- Identifier must not end in `.app` (conflicts with macOS bundle extension)
- React 19: `useRef()` requires explicit initial value — use `useRef<T | null>(null)`
- Migration SQL is hashed — never modify an already-applied migration, add new versions instead

## What's Next

### Phase 2: Design (Buddhist Theming)
- Color palette: aged paper, moss green, stone gray, deep burgundy, gold leaf
- Typography: serif headings, clean sans body
- Textures: paper grain, ink wash backgrounds
- Slow breathing transitions
- Enso circle loading animation
- "Temple Garden" atmosphere

### Phase 3: Sync
- CRDT integration (Automerge) — only `db.ts` needs to change
- Desktop sync server embedded in Tauri (port 8108)
- mDNS discovery on phone
- Delta sync protocol
- Lotus breathing animation during sync

### Phase 4: Polish & Ship
- Encryption at rest (both platforms)
- App icon and splash screen (enso circle)
- App Store metadata and screenshots
- Desktop installer bundles
- Handoff documentation for gift recipient
