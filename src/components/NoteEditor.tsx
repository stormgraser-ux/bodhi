import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import type { Note } from "../types/note";
import { TagInput } from "./TagInput";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveDot, setShowSaveDot] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteIdRef = useRef(note.id);
  const releaseBtnRef = useRef<HTMLButtonElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: note.body,
    onUpdate: ({ editor }) => {
      const md = (editor.storage as any).markdown.getMarkdown() as string;
      save(title, md);
    },
  });

  // Sync editor content when note changes (switching notes)
  useEffect(() => {
    if (noteIdRef.current !== note.id) {
      noteIdRef.current = note.id;
      setTitle(note.title);
      if (editor) {
        const parsed = (editor.storage as any).markdown.parser.parse(note.body);
        editor.commands.setContent(parsed);
      }
    }
  }, [note.id, note.title, note.body, editor]);

  const save = useCallback(
    (t: string, b: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSave(note.id, t, b);
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
    const md = editor ? ((editor.storage as any).markdown.getMarkdown() as string) : "";
    save(val, md);
  };

  const handleRelease = () => {
    if (releaseBtnRef.current) {
      spawnLeaf(releaseBtnRef.current);
    }
    setShowDeleteConfirm(false);
    setTimeout(() => onDelete(note.id), 300);
  };

  if (!editor) return null;

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
      <div className="editor-body">
        <div className="tiptap-toolbar">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive("bold") ? "is-active" : ""}
            title="Bold"
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive("italic") ? "is-active" : ""}
            title="Italic"
          >
            I
          </button>
          <span className="toolbar-divider" />
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive("heading", { level: 1 }) ? "is-active" : ""}
            title="Heading 1"
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""}
            title="Heading 2"
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive("heading", { level: 3 }) ? "is-active" : ""}
            title="Heading 3"
          >
            H3
          </button>
          <span className="toolbar-divider" />
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive("bulletList") ? "is-active" : ""}
            title="Bullet list"
          >
            &bull;
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive("orderedList") ? "is-active" : ""}
            title="Numbered list"
          >
            1.
          </button>
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={editor.isActive("taskList") ? "is-active" : ""}
            title="Task list"
          >
            &#x2611;
          </button>
          <span className="toolbar-divider" />
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive("blockquote") ? "is-active" : ""}
            title="Blockquote"
          >
            &ldquo;
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={editor.isActive("code") ? "is-active" : ""}
            title="Inline code"
          >
            &lt;/&gt;
          </button>
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal rule"
          >
            &#8212;
          </button>
        </div>
        <EditorContent editor={editor} />
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
