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
}
