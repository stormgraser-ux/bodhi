import type { Note } from "../types/note";

interface NoteListItemProps {
  note: Note;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString();
}

function getPreview(body: string): string {
  const plain = body.replace(/[#*`_~\[\]()>-]/g, "").trim();
  if (plain.length <= 80) return plain;
  return plain.slice(0, 80) + "...";
}

export function NoteListItem({ note, isSelected, onSelect }: NoteListItemProps) {
  return (
    <div
      className={`note-list-item ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(note.id)}
    >
      <div className="note-list-item-title">
        {note.title || "Untitled"}
      </div>
      <div className="note-list-item-preview">
        {getPreview(note.body) || "Empty note"}
      </div>
      <div className="note-list-item-meta">
        <span className="note-list-item-date">{formatDate(note.updated_at)}</span>
        {note.tags.length > 0 && (
          <span className="note-list-item-tags">
            {note.tags.map((t) => (
              <span key={t} className="tag-badge">{t}</span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
