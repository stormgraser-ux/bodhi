import { useState, useCallback } from "react";
import { useNotes } from "./hooks/useNotes";
import { useSearch } from "./hooks/useSearch";
import { NoteList } from "./components/NoteList";
import { NoteEditor } from "./components/NoteEditor";
import { SearchBar } from "./components/SearchBar";
import { TagFilter } from "./components/TagFilter";
import { PrivacyPanel } from "./components/PrivacyPanel";

export default function App() {
  const notes = useNotes();
  const search = useSearch();
  const [showPrivacy, setShowPrivacy] = useState(false);

  const displayNotes = search.results ?? notes.notes;

  const handleCreate = useCallback(async () => {
    search.clearSearch();
    await notes.createNote();
    search.refreshTags();
  }, [notes, search]);

  const handleDelete = useCallback(
    async (id: string) => {
      await notes.deleteNote(id);
      search.refreshTags();
    },
    [notes, search]
  );

  const handleTagsChange = useCallback(
    async (id: string, tags: string[]) => {
      await notes.updateTags(id, tags);
      search.refreshTags();
    },
    [notes, search]
  );

  if (notes.loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <div className="sidebar">
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
          onSelect={notes.selectNote}
          onCreate={handleCreate}
        />
      </div>
      <div className="editor-pane">
        {notes.selected ? (
          <NoteEditor
            key={notes.selected.id}
            note={notes.selected}
            allTags={search.allTags}
            onSave={notes.updateNote}
            onDelete={handleDelete}
            onTagsChange={handleTagsChange}
          />
        ) : (
          <div className="editor-empty">
            <p>Select a note or create a new one</p>
          </div>
        )}
      </div>
      {showPrivacy && <PrivacyPanel onClose={() => setShowPrivacy(false)} />}
    </div>
  );
}
