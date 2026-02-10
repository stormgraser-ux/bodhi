export interface Note {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface NoteRow {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  crdt_state?: Uint8Array | null;
}

export interface DeletionRecord {
  note_id: string;
  deleted_at: string;
}
