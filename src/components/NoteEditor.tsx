import { useState, useEffect, useRef, useCallback } from "react";
import MDEditor from "@uiw/react-md-editor";
import type { Note } from "../types/note";
import { TagInput } from "./TagInput";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { spawnLeaf } from "../lib/leaf";

interface NoteEditorProps {
  note: Note;
  allTags: string[];
  onSave: (id: string, title: string, body: string) => void;
  onDelete: (id: string) => void;
  onTagsChange: (id: string, tags: string[]) => void;
  onBack?: () => void;
}

export function NoteEditor({ note, allTags, onSave, onDelete, onTagsChange, onBack }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveDot, setShowSaveDot] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteIdRef = useRef(note.id);
  const releaseBtnRef = useRef<HTMLButtonElement | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    if (noteIdRef.current !== note.id) {
      noteIdRef.current = note.id;
      setTitle(note.title);
      setBody(note.body);
    }
  }, [note.id, note.title, note.body]);

  const save = useCallback(
    (t: string, b: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSave(note.id, t, b);
        // Gold dot presence
        setShowSaveDot(true);
        setTimeout(() => setShowSaveDot(false), 1800);
      }, 1000);
    },
    [note.id, onSave]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    save(val, body);
  };

  const handleBodyChange = (val: string | undefined) => {
    const newBody = val ?? "";
    setBody(newBody);
    save(title, newBody);
  };

  const handleRelease = () => {
    // Spawn falling leaf from the button
    if (releaseBtnRef.current) {
      spawnLeaf(releaseBtnRef.current);
    }
    setShowDeleteConfirm(false);
    // Brief pause so the leaf is visible before the note disappears
    setTimeout(() => onDelete(note.id), 300);
  };

  return (
    <div className="note-editor">
      <div className="editor-header">
        {onBack && (
          <button className="btn-back" onClick={onBack} title="Back to notes">
            &larr;
          </button>
        )}
        <input
          className="editor-title"
          type="text"
          placeholder="Unwritten"
          value={title}
          onChange={handleTitleChange}
        />
        <div className={`save-dot ${showSaveDot ? "visible" : ""}`} />
        <button
          className="btn-delete"
          ref={releaseBtnRef}
          onClick={() => setShowDeleteConfirm(true)}
          title="Release this note"
        >
          Release
        </button>
      </div>
      <div className="editor-tags">
        <TagInput
          tags={note.tags}
          allTags={allTags}
          onChange={(tags) => onTagsChange(note.id, tags)}
        />
      </div>
      <div className="editor-body" data-color-mode="light">
        <MDEditor
          value={body}
          onChange={handleBodyChange}
          preview={isMobile ? "edit" : "live"}
          height="100%"
          visibleDragbar={false}
          hideToolbar={isMobile}
        />
      </div>
      {showDeleteConfirm && (
        <div className="confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p>Release &ldquo;{note.title || "Unwritten"}&rdquo; back to emptiness?</p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>
                Keep
              </button>
              <button className="btn-danger" ref={releaseBtnRef} onClick={handleRelease}>
                Release
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
