import * as db from "./db";
import { mergeNoteDoc, readNoteDoc } from "./crdt";
import { IS_SYNC } from "./env";

interface SyncPayload {
  notes: Array<{ id: string; crdt_state: string }>;
  deletions: Array<{ note_id: string; deleted_at: string }>;
}

interface SyncResponse {
  notes: Array<{ id: string; crdt_state: string }>;
  deletions: Array<{ note_id: string; deleted_at: string }>;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

let syncBaseUrl = "";

/** Set the base URL for sync requests (e.g. "http://192.168.1.5:8108"). */
export function setSyncBaseUrl(url: string) {
  syncBaseUrl = url;
}

/** Get the current sync base URL. Empty string = same-origin (sync PWA on :8108). */
export function getSyncBaseUrl(): string {
  return syncBaseUrl;
}

function getBaseUrl(): string {
  // Sync PWA served from desktop: same-origin, no prefix needed
  if (IS_SYNC) return "";
  // GitHub Pages PWA: use the stored desktop URL
  return syncBaseUrl;
}

/** Check if the sync server is reachable. */
export async function checkServerStatus(): Promise<{ status: string; version: string }> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/status`);
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  return res.json();
}

/** Perform a full sync with the desktop server. */
export async function performSync(): Promise<{ notesReceived: number; deletionsReceived: number }> {
  const base = getBaseUrl();

  // Gather local data
  const localNotes = await db.getAllNotesWithCrdt();
  const localDeletions = await db.getAllDeletions();

  // Build payload (only notes with CRDT state)
  const payload: SyncPayload = {
    notes: localNotes
      .filter((n) => n.crdt_state !== null)
      .map((n) => ({
        id: n.id,
        crdt_state: toBase64(n.crdt_state!),
      })),
    deletions: localDeletions.map((d) => ({
      note_id: d.note_id,
      deleted_at: d.deleted_at,
    })),
  };

  // Send to server
  const res = await fetch(`${base}/api/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
  const response: SyncResponse = await res.json();

  // Apply remote deletions locally
  for (const del of response.deletions) {
    await db.applyDeletion(del.note_id, del.deleted_at);
  }

  // Apply remote notes locally — merge CRDT if we have local state
  for (const remoteNote of response.notes) {
    const remoteCrdt = fromBase64(remoteNote.crdt_state);

    // Check if we have a local version
    const localMatch = localNotes.find((n) => n.id === remoteNote.id);
    let finalCrdt: Uint8Array;

    if (localMatch?.crdt_state) {
      finalCrdt = mergeNoteDoc(localMatch.crdt_state, remoteCrdt);
    } else {
      finalCrdt = remoteCrdt;
    }

    // Read merged plaintext from CRDT
    const { title, body, tags, created_at, updated_at } = readNoteDoc(finalCrdt);
    await db.applySyncedNote(remoteNote.id, title, body, tags, created_at, updated_at, finalCrdt);
  }

  return {
    notesReceived: response.notes.length,
    deletionsReceived: response.deletions.length,
  };
}
