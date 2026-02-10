import * as Automerge from "@automerge/automerge";

interface NoteDoc {
  title: string;
  body: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

/** Create a new Automerge document for a note. Returns binary state. */
export function createNoteDoc(
  title: string,
  body: string,
  tags: string[],
  created_at: string,
  updated_at: string
): Uint8Array {
  let doc = Automerge.init<NoteDoc>();
  doc = Automerge.change(doc, (d) => {
    d.title = title;
    d.body = body;
    d.tags = tags.join(",");
    d.created_at = created_at;
    d.updated_at = updated_at;
  });
  return Automerge.save(doc);
}

/** Update an existing note's CRDT state. Returns updated binary. */
export function updateNoteDoc(
  existingState: Uint8Array,
  title: string,
  body: string,
  tags: string[],
  updated_at: string
): Uint8Array {
  let doc = Automerge.load<NoteDoc>(existingState);
  doc = Automerge.change(doc, (d) => {
    d.title = title;
    d.body = body;
    d.tags = tags.join(",");
    d.updated_at = updated_at;
  });
  return Automerge.save(doc);
}

/** Merge two CRDT states (local + remote). Returns merged binary. */
export function mergeNoteDoc(
  localState: Uint8Array,
  remoteState: Uint8Array
): Uint8Array {
  const local = Automerge.load<NoteDoc>(localState);
  const remote = Automerge.load<NoteDoc>(remoteState);
  const merged = Automerge.merge(local, remote);
  return Automerge.save(merged);
}

/** Read plaintext fields from a CRDT state. */
export function readNoteDoc(state: Uint8Array): {
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
} {
  const doc = Automerge.load<NoteDoc>(state);
  return {
    title: doc.title,
    body: doc.body,
    tags: doc.tags ? doc.tags.split(",").filter(Boolean) : [],
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}
