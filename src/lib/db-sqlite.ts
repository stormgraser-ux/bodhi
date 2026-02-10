import Database from "@tauri-apps/plugin-sql";
import type { Note, NoteRow } from "../types/note";

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
  await conn.execute(
    "INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [id, "", noteBody, timestamp, timestamp]
  );
  const noteTags = tags ?? [];
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
  await conn.execute(
    "UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ?",
    [title, body, now(), id]
  );
}

export async function deleteNote(id: string): Promise<void> {
  const conn = await getDb();
  await conn.execute("DELETE FROM note_tags WHERE note_id = ?", [id]);
  await conn.execute("DELETE FROM notes WHERE id = ?", [id]);
}

export async function setNoteTags(noteId: string, tags: string[]): Promise<void> {
  const conn = await getDb();
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
