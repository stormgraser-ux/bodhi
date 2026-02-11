import Database from "@tauri-apps/plugin-sql";
import type { Note, NoteRow, DeletionRecord } from "../types/note";
// crdt is dynamically imported to keep Automerge WASM off the critical load path
async function getCrdt() { return import("./crdt"); }

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:bodhi.db");
  }
  return db;
}

function uuid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export async function getAllNotes(): Promise<Note[]> {
  const conn = await getDb();
  const rows = await conn.select<NoteRow[]>(
    "SELECT * FROM notes ORDER BY updated_at DESC"
  );
  const notes: Note[] = [];
  for (const row of rows) {
    const tagRows = await conn.select<{ tag: string }[]>(
      "SELECT tag FROM note_tags WHERE note_id = ? ORDER BY tag",
      [row.id]
    );
    notes.push({ ...row, tags: tagRows.map((t) => t.tag) });
  }
  return notes;
}

export async function createNote(body?: string, tags?: string[]): Promise<Note> {
  const conn = await getDb();
  const id = uuid();
  const timestamp = now();
  const noteBody = body ?? "";
  const noteTags = tags ?? [];
  const { createNoteDoc } = await getCrdt();
  const crdtState = createNoteDoc("", noteBody, noteTags, timestamp, timestamp);
  await conn.execute(
    "INSERT INTO notes (id, title, body, created_at, updated_at, crdt_state) VALUES (?, ?, ?, ?, ?, ?)",
    [id, "", noteBody, timestamp, timestamp, Array.from(crdtState)]
  );
  for (const tag of noteTags) {
    await conn.execute(
      "INSERT INTO note_tags (note_id, tag) VALUES (?, ?)",
      [id, tag.trim().toLowerCase()]
    );
  }
  return { id, title: "", body: noteBody, created_at: timestamp, updated_at: timestamp, tags: noteTags };
}

export async function updateNote(id: string, title: string, body: string): Promise<void> {
  const conn = await getDb();
  const timestamp = now();
  // Load existing CRDT state + tags for update
  const rows = await conn.select<{ crdt_state: number[] | null }[]>(
    "SELECT crdt_state FROM notes WHERE id = ?",
    [id]
  );
  const tagRows = await conn.select<{ tag: string }[]>(
    "SELECT tag FROM note_tags WHERE note_id = ? ORDER BY tag",
    [id]
  );
  const tags = tagRows.map((t) => t.tag);
  const existing = rows[0]?.crdt_state;
  const { createNoteDoc, updateNoteDoc } = await getCrdt();
  let crdtState: Uint8Array;
  if (existing) {
    crdtState = updateNoteDoc(new Uint8Array(existing), title, body, tags, timestamp);
  } else {
    // Lazy migration: create fresh CRDT from current data
    const noteRows = await conn.select<{ created_at: string }[]>(
      "SELECT created_at FROM notes WHERE id = ?",
      [id]
    );
    crdtState = createNoteDoc(title, body, tags, noteRows[0]?.created_at ?? timestamp, timestamp);
  }
  await conn.execute(
    "UPDATE notes SET title = ?, body = ?, updated_at = ?, crdt_state = ? WHERE id = ?",
    [title, body, timestamp, Array.from(crdtState), id]
  );
}

export async function deleteNote(id: string): Promise<void> {
  const conn = await getDb();
  await conn.execute(
    "INSERT OR REPLACE INTO deletions (note_id, deleted_at) VALUES (?, ?)",
    [id, now()]
  );
  await conn.execute("DELETE FROM note_tags WHERE note_id = ?", [id]);
  await conn.execute("DELETE FROM notes WHERE id = ?", [id]);
}

export async function setNoteTags(noteId: string, tags: string[]): Promise<void> {
  const conn = await getDb();
  const timestamp = now();
  // Update CRDT state with new tags
  const rows = await conn.select<{ title: string; body: string; created_at: string; crdt_state: number[] | null }[]>(
    "SELECT title, body, created_at, crdt_state FROM notes WHERE id = ?",
    [noteId]
  );
  if (rows[0]) {
    const { title, body, created_at, crdt_state } = rows[0];
    const { createNoteDoc, updateNoteDoc } = await getCrdt();
    let crdtBin: Uint8Array;
    if (crdt_state) {
      crdtBin = updateNoteDoc(new Uint8Array(crdt_state), title, body, tags, timestamp);
    } else {
      crdtBin = createNoteDoc(title, body, tags, created_at, timestamp);
    }
    await conn.execute(
      "UPDATE notes SET crdt_state = ?, updated_at = ? WHERE id = ?",
      [Array.from(crdtBin), timestamp, noteId]
    );
  }
  await conn.execute("DELETE FROM note_tags WHERE note_id = ?", [noteId]);
  for (const tag of tags) {
    await conn.execute(
      "INSERT INTO note_tags (note_id, tag) VALUES (?, ?)",
      [noteId, tag.trim().toLowerCase()]
    );
  }
}

export async function getAllTags(): Promise<string[]> {
  const conn = await getDb();
  const rows = await conn.select<{ tag: string }[]>(
    "SELECT DISTINCT tag FROM note_tags ORDER BY tag"
  );
  return rows.map((r) => r.tag);
}

export async function searchNotes(query: string, filterTag: string | null): Promise<Note[]> {
  const conn = await getDb();
  let sql: string;
  let params: string[];

  if (filterTag) {
    sql = `SELECT DISTINCT n.* FROM notes n
           JOIN note_tags nt ON n.id = nt.note_id
           WHERE nt.tag = ? AND (n.title LIKE ? OR n.body LIKE ?)
           ORDER BY n.updated_at DESC`;
    const like = `%${query}%`;
    params = [filterTag, like, like];
  } else if (query) {
    sql = `SELECT * FROM notes WHERE title LIKE ? OR body LIKE ? ORDER BY updated_at DESC`;
    const like = `%${query}%`;
    params = [like, like];
  } else {
    return getAllNotes();
  }

  const rows = await conn.select<NoteRow[]>(sql, params);
  const notes: Note[] = [];
  for (const row of rows) {
    const tagRows = await conn.select<{ tag: string }[]>(
      "SELECT tag FROM note_tags WHERE note_id = ? ORDER BY tag",
      [row.id]
    );
    notes.push({ ...row, tags: tagRows.map((t) => t.tag) });
  }
  return notes;
}

export async function getAllNotesWithCrdt(): Promise<Array<{ id: string; crdt_state: Uint8Array | null }>> {
  const conn = await getDb();
  const rows = await conn.select<{ id: string; crdt_state: number[] | null }[]>(
    "SELECT id, crdt_state FROM notes"
  );
  return rows.map((r) => ({
    id: r.id,
    crdt_state: r.crdt_state ? new Uint8Array(r.crdt_state) : null,
  }));
}

export async function getAllDeletions(): Promise<DeletionRecord[]> {
  const conn = await getDb();
  return conn.select<DeletionRecord[]>("SELECT note_id, deleted_at FROM deletions");
}

export async function applySyncedNote(
  id: string, title: string, body: string, tags: string[],
  created_at: string, updated_at: string, crdt_state: Uint8Array
): Promise<void> {
  const conn = await getDb();
  // Upsert the note
  await conn.execute(
    `INSERT INTO notes (id, title, body, created_at, updated_at, crdt_state)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title=?, body=?, updated_at=?, crdt_state=?`,
    [id, title, body, created_at, updated_at, Array.from(crdt_state),
     title, body, updated_at, Array.from(crdt_state)]
  );
  // Replace tags
  await conn.execute("DELETE FROM note_tags WHERE note_id = ?", [id]);
  for (const tag of tags) {
    await conn.execute(
      "INSERT INTO note_tags (note_id, tag) VALUES (?, ?)",
      [id, tag.trim().toLowerCase()]
    );
  }
}

export async function applyDeletion(noteId: string, deletedAt: string): Promise<void> {
  const conn = await getDb();
  await conn.execute(
    "INSERT OR REPLACE INTO deletions (note_id, deleted_at) VALUES (?, ?)",
    [noteId, deletedAt]
  );
  await conn.execute("DELETE FROM note_tags WHERE note_id = ?", [noteId]);
  await conn.execute("DELETE FROM notes WHERE id = ?", [noteId]);
}

// Settings are only used by the phone PWA (IndexedDB). Desktop doesn't need them.
export async function getSetting(_key: string): Promise<string | null> {
  return null;
}

export async function setSetting(_key: string, _value: string): Promise<void> {}

export async function deleteSetting(_key: string): Promise<void> {}
