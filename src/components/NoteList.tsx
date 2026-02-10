import { useState, useEffect, useRef } from "react";
import type { Note } from "../types/note";
import { NoteListItem } from "./NoteListItem";
import { DailyTeaching } from "./DailyTeaching";
import { useMediaQuery } from "../hooks/useMediaQuery";
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
  const isMobile = useMediaQuery("(max-width: 768px)");

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
          <div className={isMobile ? "note-list-empty-mobile" : "note-list-empty"}>
            {isMobile ? (
              <>
                <DailyTeaching />
                <div className="mobile-lotus" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="100 350 600 300" fill="none" stroke="#1a1a1a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M400 620c-70-40-120-95-150-165 65 5 115 25 150 62 35-37 85-57 150-62-30 70-80 125-150 165Z"/>
                    <path d="M400 620c-95-25-165-80-205-155 75-15 140 0 195 45 55-45 120-60 195-45-40 75-110 130-205 155Z"/>
                    <path d="M255 520c-55-20-95-55-120-105 60-5 110 10 150 45"/>
                    <path d="M545 520c55-20 95-55 120-105-60-5-110 10-150 45"/>
                    <path d="M400 585c-48-30-82-68-102-114 45 5 80 20 102 45 22-25 57-40 102-45-20 46-54 84-102 114Z"/>
                    <path d="M400 540c-30-22-52-48-66-78 30 4 52 14 66 30 14-16 36-26 66-30-14 30-36 56-66 78Z"/>
                    <path d="M400 520c-18 0-34-10-40-24 14-6 26-9 40-9s26 3 40 9c-6 14-22 24-40 24Z"/>
                  </svg>
                </div>
              </>
            ) : "Begin when you are ready."}
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
