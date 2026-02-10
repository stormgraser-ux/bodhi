import { useState, useEffect, useRef } from "react";
import type { Note } from "../types/note";
import { NoteListItem } from "./NoteListItem";
import { NOTE_PRESETS, getPresetBody, getPresetTiptapContent } from "../data/note-presets";

interface NoteListProps {
  notes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (body?: string, tags?: string[], tiptapContent?: Record<string, unknown>) => void;
}

export function NoteList({ notes, selectedId, onSelect, onCreate }: NoteListProps) {
  const [showPresets, setShowPresets] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showPresets) return;
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showPresets]);

  const handlePresetClick = (presetId: string) => {
    const preset = NOTE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const body = getPresetBody(preset);
    const tiptapContent = getPresetTiptapContent(preset);
    onCreate(body || undefined, preset.tag ? [preset.tag] : undefined, tiptapContent);
    setShowPresets(false);
  };

  return (
    <div className="note-list">
      <div className="note-list-header">
        <span className="note-count">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
        <div className="new-note-container" ref={menuRef}>
          <button
            className="btn-new-note"
            onClick={() => setShowPresets((prev) => !prev)}
            title="New note"
          >
            +
          </button>
          {showPresets && (
            <div className="preset-menu">
              {NOTE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className="preset-option"
                  onClick={() => handlePresetClick(preset.id)}
                >
                  <span className="preset-icon">{preset.icon}</span>
                  <span className="preset-label">{preset.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
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
