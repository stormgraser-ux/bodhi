import { IS_TAURI } from "./env";
import type { Note } from "../types/note";

interface DbBackend {
  getAllNotes(): Promise<Note[]>;
  createNote(): Promise<Note>;
  updateNote(id: string, title: string, body: string): Promise<void>;
  deleteNote(id: string): Promise<void>;
  setNoteTags(noteId: string, tags: string[]): Promise<void>;
  getAllTags(): Promise<string[]>;
  searchNotes(query: string, filterTag: string | null): Promise<Note[]>;
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

export async function createNote(): Promise<Note> {
  return (await getBackend()).createNote();
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
