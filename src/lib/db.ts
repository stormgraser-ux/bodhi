import { IS_TAURI } from "./env";
import type { Note, DeletionRecord } from "../types/note";

interface DbBackend {
  getAllNotes(): Promise<Note[]>;
  createNote(body?: string, tags?: string[]): Promise<Note>;
  updateNote(id: string, title: string, body: string): Promise<void>;
  deleteNote(id: string): Promise<void>;
  setNoteTags(noteId: string, tags: string[]): Promise<void>;
  getAllTags(): Promise<string[]>;
  searchNotes(query: string, filterTag: string | null): Promise<Note[]>;
  getAllNotesWithCrdt(): Promise<Array<{ id: string; crdt_state: Uint8Array | null }>>;
  getAllDeletions(): Promise<DeletionRecord[]>;
  applySyncedNote(id: string, title: string, body: string, tags: string[], created_at: string, updated_at: string, crdt_state: Uint8Array): Promise<void>;
  applyDeletion(noteId: string, deletedAt: string): Promise<void>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  deleteSetting(key: string): Promise<void>;
}

let backend: DbBackend | null = null;

async function getBackend(): Promise<DbBackend> {
  if (!backend) {
    if (IS_TAURI) {
      backend = await import("./db-sqlite");
    } else {
      backend = await import("./db-indexeddb");
    }
  }
  return backend;
}

export async function getAllNotes(): Promise<Note[]> {
  return (await getBackend()).getAllNotes();
}

export async function createNote(body?: string, tags?: string[]): Promise<Note> {
  return (await getBackend()).createNote(body, tags);
}

export async function updateNote(id: string, title: string, body: string): Promise<void> {
  return (await getBackend()).updateNote(id, title, body);
}

export async function deleteNote(id: string): Promise<void> {
  return (await getBackend()).deleteNote(id);
}

export async function setNoteTags(noteId: string, tags: string[]): Promise<void> {
  return (await getBackend()).setNoteTags(noteId, tags);
}

export async function getAllTags(): Promise<string[]> {
  return (await getBackend()).getAllTags();
}

export async function searchNotes(query: string, filterTag: string | null): Promise<Note[]> {
  return (await getBackend()).searchNotes(query, filterTag);
}

export async function getAllNotesWithCrdt(): Promise<Array<{ id: string; crdt_state: Uint8Array | null }>> {
  return (await getBackend()).getAllNotesWithCrdt();
}

export async function getAllDeletions(): Promise<DeletionRecord[]> {
  return (await getBackend()).getAllDeletions();
}

export async function applySyncedNote(
  id: string, title: string, body: string, tags: string[],
  created_at: string, updated_at: string, crdt_state: Uint8Array
): Promise<void> {
  return (await getBackend()).applySyncedNote(id, title, body, tags, created_at, updated_at, crdt_state);
}

export async function applyDeletion(noteId: string, deletedAt: string): Promise<void> {
  return (await getBackend()).applyDeletion(noteId, deletedAt);
}

export async function getSetting(key: string): Promise<string | null> {
  return (await getBackend()).getSetting(key);
}

export async function setSetting(key: string, value: string): Promise<void> {
  return (await getBackend()).setSetting(key, value);
}

export async function deleteSetting(key: string): Promise<void> {
  return (await getBackend()).deleteSetting(key);
}
