import { openDB, type IDBPDatabase } from "idb";
import type { Note, NoteRow, DeletionRecord } from "../types/note";
import { createNoteDoc, updateNoteDoc } from "./crdt";

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
  deletions: {
    key: string;
    value: DeletionRecord;
  };
  settings: {
    key: string;
    value: { key: string; value: string };
  };
}

let dbPromise: Promise<IDBPDatabase<BodhiDB>> | null = null;

function getDb(): Promise<IDBPDatabase<BodhiDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BodhiDB>("bodhi", 3, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const noteStore = db.createObjectStore("notes", { keyPath: "id" });
          noteStore.createIndex("by-updated", "updated_at");

          const tagStore = db.createObjectStore("note_tags", { autoIncrement: true });
          tagStore.createIndex("by-note", "note_id");
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("deletions")) {
            db.createObjectStore("deletions", { keyPath: "note_id" });
          }
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains("settings")) {
            db.createObjectStore("settings", { keyPath: "key" });
          }
        }
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

export async function createNote(body?: string, tags?: string[]): Promise<Note> {
  const db = await getDb();
  const id = uuid();
  const timestamp = now();
  const noteBody = body ?? "";
  const noteTags = tags ?? [];
  const crdtState = createNoteDoc("", noteBody, noteTags, timestamp, timestamp);
  const row: NoteRow = { id, title: "", body: noteBody, created_at: timestamp, updated_at: timestamp, crdt_state: crdtState };
  const tx = db.transaction(["notes", "note_tags"], "readwrite");
  await tx.objectStore("notes").put(row);
  const tagStore = tx.objectStore("note_tags");
  for (const tag of noteTags) {
    await tagStore.put({ note_id: id, tag: tag.trim().toLowerCase() });
  }
  await tx.done;
  return { ...row, tags: noteTags };
}

export async function updateNote(id: string, title: string, body: string): Promise<void> {
  const db = await getDb();
  const existing = await db.get("notes", id);
  if (!existing) return;
  const timestamp = now();
  const tags = await getTagsForNote(db, id);
  if (existing.crdt_state) {
    existing.crdt_state = updateNoteDoc(existing.crdt_state, title, body, tags, timestamp);
  } else {
    existing.crdt_state = createNoteDoc(title, body, tags, existing.created_at, timestamp);
  }
  existing.title = title;
  existing.body = body;
  existing.updated_at = timestamp;
  await db.put("notes", existing);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["notes", "note_tags", "deletions"], "readwrite");
  await tx.objectStore("deletions").put({ note_id: id, deleted_at: now() });
  await tx.objectStore("notes").delete(id);
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
  const timestamp = now();
  // Update CRDT state with new tags
  const existing = await db.get("notes", noteId);
  if (existing) {
    if (existing.crdt_state) {
      existing.crdt_state = updateNoteDoc(existing.crdt_state, existing.title, existing.body, tags, timestamp);
    } else {
      existing.crdt_state = createNoteDoc(existing.title, existing.body, tags, existing.created_at, timestamp);
    }
    existing.updated_at = timestamp;
    await db.put("notes", existing);
  }
  const tx = db.transaction("note_tags", "readwrite");
  const store = tx.objectStore("note_tags");
  const index = store.index("by-note");
  let cursor = await index.openCursor(noteId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
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

export async function getAllNotesWithCrdt(): Promise<Array<{ id: string; crdt_state: Uint8Array | null }>> {
  const db = await getDb();
  const rows = await db.getAll("notes");
  return rows.map((r) => ({
    id: r.id,
    crdt_state: r.crdt_state ?? null,
  }));
}

export async function getAllDeletions(): Promise<DeletionRecord[]> {
  const db = await getDb();
  return db.getAll("deletions");
}

export async function applySyncedNote(
  id: string, title: string, body: string, tags: string[],
  created_at: string, updated_at: string, crdt_state: Uint8Array
): Promise<void> {
  const db = await getDb();
  const row: NoteRow = { id, title, body, created_at, updated_at, crdt_state };
  const tx = db.transaction(["notes", "note_tags"], "readwrite");
  await tx.objectStore("notes").put(row);
  const tagStore = tx.objectStore("note_tags");
  const tagIndex = tagStore.index("by-note");
  let cursor = await tagIndex.openCursor(id);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  for (const tag of tags) {
    await tagStore.put({ note_id: id, tag: tag.trim().toLowerCase() });
  }
  await tx.done;
}

export async function applyDeletion(noteId: string, deletedAt: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["notes", "note_tags", "deletions"], "readwrite");
  await tx.objectStore("deletions").put({ note_id: noteId, deleted_at: deletedAt });
  await tx.objectStore("notes").delete(noteId);
  const tagStore = tx.objectStore("note_tags");
  const tagIndex = tagStore.index("by-note");
  let cursor = await tagIndex.openCursor(noteId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.get("settings", key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.put("settings", { key, value });
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDb();
  await db.delete("settings", key);
}
