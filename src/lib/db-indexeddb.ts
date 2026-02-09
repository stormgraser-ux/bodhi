import { openDB, type IDBPDatabase } from "idb";
import type { Note, NoteRow } from "../types/note";

interface BodhiDB {
  notes: {
    key: string;
    value: NoteRow;
    indexes: { "by-updated": string };
  };
  note_tags: {
    key: number;
    value: { note_id: string; tag: string };
    indexes: { "by-note": string };
  };
}

let dbPromise: Promise<IDBPDatabase<BodhiDB>> | null = null;

function getDb(): Promise<IDBPDatabase<BodhiDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BodhiDB>("bodhi", 1, {
      upgrade(db) {
        const noteStore = db.createObjectStore("notes", { keyPath: "id" });
        noteStore.createIndex("by-updated", "updated_at");

        const tagStore = db.createObjectStore("note_tags", { autoIncrement: true });
        tagStore.createIndex("by-note", "note_id");
      },
    });
  }
  return dbPromise;
}

function uuid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

async function getTagsForNote(db: IDBPDatabase<BodhiDB>, noteId: string): Promise<string[]> {
  const all = await db.getAllFromIndex("note_tags", "by-note", noteId);
  return all.map((t) => t.tag).sort();
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDb();
  const rows = await db.getAll("notes");
  rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const notes: Note[] = [];
  for (const row of rows) {
    const tags = await getTagsForNote(db, row.id);
    notes.push({ ...row, tags });
  }
  return notes;
}

export async function createNote(): Promise<Note> {
  const db = await getDb();
  const id = uuid();
  const timestamp = now();
  const row: NoteRow = { id, title: "", body: "", created_at: timestamp, updated_at: timestamp };
  await db.put("notes", row);
  return { ...row, tags: [] };
}

export async function updateNote(id: string, title: string, body: string): Promise<void> {
  const db = await getDb();
  const existing = await db.get("notes", id);
  if (!existing) return;
  existing.title = title;
  existing.body = body;
  existing.updated_at = now();
  await db.put("notes", existing);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["notes", "note_tags"], "readwrite");
  await tx.objectStore("notes").delete(id);
  // Delete all tags for this note
  const tagStore = tx.objectStore("note_tags");
  const tagIndex = tagStore.index("by-note");
  let cursor = await tagIndex.openCursor(id);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function setNoteTags(noteId: string, tags: string[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("note_tags", "readwrite");
  const store = tx.objectStore("note_tags");
  const index = store.index("by-note");
  // Delete existing tags for this note
  let cursor = await index.openCursor(noteId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  // Insert new tags
  for (const tag of tags) {
    await store.put({ note_id: noteId, tag: tag.trim().toLowerCase() });
  }
  await tx.done;
}

export async function getAllTags(): Promise<string[]> {
  const db = await getDb();
  const all = await db.getAll("note_tags");
  const unique = new Set(all.map((t) => t.tag));
  return [...unique].sort();
}

export async function searchNotes(query: string, filterTag: string | null): Promise<Note[]> {
  if (!query && !filterTag) {
    return getAllNotes();
  }

  const db = await getDb();
  let rows = await db.getAll("notes");
  rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const notes: Note[] = [];
  for (const row of rows) {
    const tags = await getTagsForNote(db, row.id);

    if (filterTag && !tags.includes(filterTag)) continue;

    if (query) {
      const q = query.toLowerCase();
      if (!row.title.toLowerCase().includes(q) && !row.body.toLowerCase().includes(q)) continue;
    }

    notes.push({ ...row, tags });
  }
  return notes;
}
