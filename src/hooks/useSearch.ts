import { useState, useCallback, useEffect, useRef } from "react";
import type { Note } from "../types/note";
import * as db from "../lib/db";

export function useSearch() {
  const [query, setQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [results, setResults] = useState<Note[] | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshTags = useCallback(async () => {
    const tags = await db.getAllTags();
    setAllTags(tags);
  }, []);

  useEffect(() => {
    refreshTags();
  }, [refreshTags]);

  const doSearch = useCallback(
    async (q: string, tag: string | null) => {
      if (!q && !tag) {
        setResults(null);
        return;
      }
      const notes = await db.searchNotes(q, tag);
      setResults(notes);
    },
    []
  );

  const handleQueryChange = useCallback(
    (q: string) => {
      setQuery(q);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(q, filterTag), 300);
    },
    [doSearch, filterTag]
  );

  const handleTagFilter = useCallback(
    (tag: string | null) => {
      setFilterTag(tag);
      doSearch(query, tag);
    },
    [doSearch, query]
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setFilterTag(null);
    setResults(null);
  }, []);

  return {
    query,
    filterTag,
    results,
    allTags,
    setQuery: handleQueryChange,
    setFilterTag: handleTagFilter,
    clearSearch,
    refreshTags,
  };
}
