import type { Note } from "../types/note";
import { NoteListItem } from "./NoteListItem";

interface NoteListProps {
  notes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function NoteList({ notes, selectedId, onSelect, onCreate }: NoteListProps) {
  return (
    <div className="note-list">
      <div className="note-list-header">
        <span className="note-count">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
        <button className="btn-new-note" onClick={onCreate} title="New note">
          +
        </button>
      </div>
      <div className="note-list-items">
        {notes.length === 0 ? (
          <div className="note-list-empty">
            Begin when you are ready.
          </div>
        ) : (
          notes.map((note) => (
            <NoteListItem
              key={note.id}
              note={note}
              isSelected={note.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
