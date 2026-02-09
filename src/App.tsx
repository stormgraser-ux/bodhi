import { useState, useCallback } from "react";
import { useNotes } from "./hooks/useNotes";
import { useSearch } from "./hooks/useSearch";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { NoteList } from "./components/NoteList";
import { NoteEditor } from "./components/NoteEditor";
import { SearchBar } from "./components/SearchBar";
import { TagFilter } from "./components/TagFilter";
import { PrivacyPanel } from "./components/PrivacyPanel";
import { EnsoLoader } from "./components/EnsoLoader";

type MobileView = "list" | "editor";

export default function App() {
  const notes = useNotes();
  const search = useSearch();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const isMobile = useMediaQuery("(max-width: 768px)");

  const displayNotes = search.results ?? notes.notes;

  const handleCreate = useCallback(async () => {
    search.clearSearch();
    await notes.createNote();
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
    <div className="app">
      <div className={sidebarClass}>
        <div className="sidebar-header">
          <h1 className="app-title">Bodhi</h1>
          <button
            className="btn-privacy"
            onClick={() => setShowPrivacy(true)}
            title="Privacy info"
          >
            &#x1f6e1;
          </button>
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
          />
        ) : (
          <div className="editor-empty">
            <p>The page awaits.</p>
          </div>
        )}
      </div>
      {showPrivacy && <PrivacyPanel onClose={() => setShowPrivacy(false)} />}
    </div>
  );
}
