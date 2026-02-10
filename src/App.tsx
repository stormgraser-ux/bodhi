import { useState, useCallback, useEffect, useRef } from "react";
import { useNotes } from "./hooks/useNotes";
import { useSearch } from "./hooks/useSearch";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { NoteList } from "./components/NoteList";
import { NoteEditor } from "./components/NoteEditor";
import { SearchBar } from "./components/SearchBar";
import { TagFilter } from "./components/TagFilter";
import { PrivacyPanel } from "./components/PrivacyPanel";
import { EnsoLoader } from "./components/EnsoLoader";
import { InkDivider } from "./components/InkDivider";
import { DailyTeaching } from "./components/DailyTeaching";
import { SyncButton } from "./components/SyncButton";
import { IS_TAURI, IS_PWA, IS_SYNC } from "./lib/env";
import { performSync, getSyncBaseUrl } from "./lib/sync-client";
import * as db from "./lib/db";

type MobileView = "list" | "editor";

export default function App() {
  const notes = useNotes();
  const search = useSearch();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [focusMode, setFocusMode] = useState(false);
  const [isPaired, setIsPaired] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const pendingTiptapContent = useRef<Record<string, unknown> | null>(null);

  const displayNotes = search.results ?? notes.notes;

  // Load pairing state from settings (phone PWA only)
  useEffect(() => {
    if (!IS_PWA || IS_SYNC) return;
    (async () => {
      const saved = await db.getSetting("sync-server-url");
      if (saved) setIsPaired(true);
    })();
  }, []);

  // Listen for sync-completed events from Tauri (desktop refreshes after phone syncs)
  useEffect(() => {
    if (!IS_TAURI) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen("sync-completed", () => {
        notes.loadNotes();
        search.refreshTags();
      });
    })();
    return () => { unlisten?.(); };
  }, [notes, search]);

  // Focus mode: F key toggles (only when not typing in an input)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isMobile) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      // Also skip if inside the TipTap editor
      if ((e.target as HTMLElement).closest(".tiptap")) return;

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setFocusMode((prev) => !prev);
      }
      if (e.key === "Escape" && focusMode) {
        setFocusMode(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, focusMode]);

  const handleCreate = useCallback(async (body?: string, tags?: string[], tiptapContent?: Record<string, unknown>) => {
    pendingTiptapContent.current = tiptapContent ?? null;
    search.clearSearch();
    await notes.createNote(body, tags);
    search.refreshTags();
    if (isMobile) setMobileView("editor");
  }, [notes, search, isMobile]);

  const handleDelete = useCallback(
    async (id: string) => {
      await notes.deleteNote(id);
      search.refreshTags();
      if (isMobile) setMobileView("list");
    },
    [notes, search, isMobile]
  );

  const handleTagsChange = useCallback(
    async (id: string, tags: string[]) => {
      await notes.updateTags(id, tags);
      search.refreshTags();
    },
    [notes, search]
  );

  const handleSelect = useCallback(
    (id: string | null) => {
      notes.selectNote(id);
      if (isMobile && id) setMobileView("editor");
    },
    [notes, isMobile]
  );

  const handleBack = useCallback(() => {
    setMobileView("list");
  }, []);

  const handleSyncComplete = useCallback(() => {
    notes.loadNotes();
    search.refreshTags();
  }, [notes, search]);

  // Auto-sync on app focus (phone PWA only)
  useEffect(() => {
    if (!IS_PWA && !IS_SYNC) return;

    let lastSync = 0;
    const COOLDOWN = 30_000; // 30s minimum between auto-syncs

    function trySync() {
      if (document.hidden) return;
      if (Date.now() - lastSync < COOLDOWN) return;
      // GitHub Pages PWA: only sync if paired (URL configured)
      if (!IS_SYNC && !getSyncBaseUrl()) return;

      lastSync = Date.now();
      performSync()
        .then(() => handleSyncComplete())
        .catch(() => {}); // Silent fail — auto-sync is best-effort
    }

    // Sync when app regains focus
    document.addEventListener("visibilitychange", trySync);
    // Initial sync after short delay (let SyncButton load the URL first)
    const timer = setTimeout(trySync, 1000);

    return () => {
      document.removeEventListener("visibilitychange", trySync);
      clearTimeout(timer);
    };
  }, [handleSyncComplete]);

  if (notes.loading) {
    return <EnsoLoader />;
  }

  const sidebarClass = isMobile
    ? `sidebar ${mobileView === "list" ? "mobile-visible" : "mobile-hidden"}`
    : "sidebar";

  const editorClass = isMobile
    ? `editor-pane ${mobileView === "editor" ? "mobile-visible" : "mobile-hidden"}`
    : "editor-pane";

  return (
    <div className={`app ${focusMode ? "focus-mode" : ""}`}>
      <div className={sidebarClass}>
        <div className="sidebar-header">
          <h1 className="app-title">Bodhi</h1>
          <div className="sidebar-header-actions">
            <SyncButton onSyncComplete={handleSyncComplete} paired={isPaired} />
            <button
              className="btn-privacy"
              onClick={() => setShowPrivacy(true)}
              title="Privacy info"
            >
              &#x1f6e1;
            </button>
          </div>
        </div>
        <SearchBar
          query={search.query}
          onChange={search.setQuery}
          onClear={search.clearSearch}
        />
        <TagFilter
          tags={search.allTags}
          activeTag={search.filterTag}
          onSelect={search.setFilterTag}
        />
        <InkDivider />
        <NoteList
          notes={displayNotes}
          selectedId={notes.selected?.id ?? null}
          onSelect={handleSelect}
          onCreate={handleCreate}
        />
      </div>
      <div className={editorClass}>
        {notes.selected ? (
          <NoteEditor
            key={notes.selected.id}
            note={notes.selected}
            allTags={search.allTags}
            onSave={notes.updateNote}
            onDelete={handleDelete}
            onTagsChange={handleTagsChange}
            onBack={isMobile ? handleBack : undefined}
            initialTiptapContent={pendingTiptapContent.current ?? undefined}
            onTiptapContentConsumed={() => { pendingTiptapContent.current = null; }}
          />
        ) : (
          <div className="editor-empty">
            <DailyTeaching />
          </div>
        )}
        {focusMode && (
          <button
            className="btn-focus"
            onClick={() => setFocusMode(false)}
            title="Exit focus mode (F)"
          >
            &#x25C1; Show sidebar
          </button>
        )}
      </div>
      {showPrivacy && (
        <PrivacyPanel
          onClose={() => setShowPrivacy(false)}
          onPairingChanged={setIsPaired}
        />
      )}
    </div>
  );
}
