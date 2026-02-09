import { useState, useEffect, useRef, useCallback } from "react";
import MDEditor from "@uiw/react-md-editor";
import type { Note } from "../types/note";
import { TagInput } from "./TagInput";

interface NoteEditorProps {
  note: Note;
  allTags: string[];
  onSave: (id: string, title: string, body: string) => void;
  onDelete: (id: string) => void;
  onTagsChange: (id: string, tags: string[]) => void;
}

export function NoteEditor({ note, allTags, onSave, onDelete, onTagsChange }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteIdRef = useRef(note.id);

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

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(note.id);
  };

  return (
    <div className="note-editor">
      <div className="editor-header">
        <input
          className="editor-title"
          type="text"
          placeholder="Untitled"
          value={title}
          onChange={handleTitleChange}
        />
        <button
          className="btn-delete"
          onClick={() => setShowDeleteConfirm(true)}
          title="Delete note"
        >
          Delete
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
          preview="live"
          height="100%"
          visibleDragbar={false}
          hideToolbar={false}
        />
      </div>
      {showDeleteConfirm && (
        <div className="confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p>Delete "{note.title || "Untitled"}"?</p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
