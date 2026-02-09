interface SearchBarProps {
  query: string;
  onChange: (q: string) => void;
  onClear: () => void;
}

export function SearchBar({ query, onChange, onClear }: SearchBarProps) {
  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search notes..."
        value={query}
        onChange={(e) => onChange(e.target.value)}
      />
      {query && (
        <button className="search-clear" onClick={onClear} title="Clear search">
          &times;
        </button>
      )}
    </div>
  );
}
