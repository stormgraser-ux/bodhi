import { useReducer, useCallback, useEffect } from "react";
import type { Note } from "../types/note";
import * as db from "../lib/db";

interface State {
  notes: Note[];
  selectedId: string | null;
  loading: boolean;
}

type Action =
  | { type: "SET_NOTES"; notes: Note[] }
  | { type: "SELECT"; id: string | null }
  | { type: "ADD_NOTE"; note: Note }
  | { type: "UPDATE_NOTE"; id: string; title: string; body: string; updated_at: string }
  | { type: "UPDATE_TAGS"; id: string; tags: string[] }
  | { type: "DELETE_NOTE"; id: string }
  | { type: "SET_LOADING"; loading: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_NOTES":
      return { ...state, notes: action.notes, loading: false };
    case "SELECT":
      return { ...state, selectedId: action.id };
    case "ADD_NOTE": {
      return {
        ...state,
        notes: [action.note, ...state.notes],
        selectedId: action.note.id,
      };
    }
    case "UPDATE_NOTE": {
      const notes = state.notes.map((n) =>
        n.id === action.id
          ? { ...n, title: action.title, body: action.body, updated_at: action.updated_at }
          : n
      );
      notes.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      return { ...state, notes };
    }
    case "UPDATE_TAGS": {
      const notes = state.notes.map((n) =>
        n.id === action.id ? { ...n, tags: action.tags } : n
      );
      return { ...state, notes };
    }
    case "DELETE_NOTE": {
      const notes = state.notes.filter((n) => n.id !== action.id);
      const selectedId =
        state.selectedId === action.id
          ? notes.length > 0
            ? notes[0].id
            : null
          : state.selectedId;
      return { ...state, notes, selectedId };
    }
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    default:
      return state;
  }
}

export function useNotes() {
  const [state, dispatch] = useReducer(reducer, {
    notes: [],
    selectedId: null,
    loading: true,
  });

  const loadNotes = useCallback(async () => {
    dispatch({ type: "SET_LOADING", loading: true });
    const notes = await db.getAllNotes();
    dispatch({ type: "SET_NOTES", notes });
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const createNote = useCallback(async () => {
    const note = await db.createNote();
    dispatch({ type: "ADD_NOTE", note });
  }, []);

  const updateNote = useCallback(async (id: string, title: string, body: string) => {
    await db.updateNote(id, title, body);
    dispatch({ type: "UPDATE_NOTE", id, title, body, updated_at: new Date().toISOString() });
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    await db.deleteNote(id);
    dispatch({ type: "DELETE_NOTE", id });
  }, []);

  const selectNote = useCallback((id: string | null) => {
    dispatch({ type: "SELECT", id });
  }, []);

  const updateTags = useCallback(async (id: string, tags: string[]) => {
    dispatch({ type: "UPDATE_TAGS", id, tags });
    try {
      await db.setNoteTags(id, tags);
    } catch (e) {
      console.error("Failed to save tags:", e);
    }
  }, []);

  const selected = state.notes.find((n) => n.id === state.selectedId) ?? null;

  return {
    notes: state.notes,
    selected,
    loading: state.loading,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
    updateTags,
    loadNotes,
  };
}
