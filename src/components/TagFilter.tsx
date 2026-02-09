interface TagFilterProps {
  tags: string[];
  activeTag: string | null;
  onSelect: (tag: string | null) => void;
}

export function TagFilter({ tags, activeTag, onSelect }: TagFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div className="tag-filter">
      <div className="tag-filter-label">Tags</div>
      <div className="tag-filter-list">
        {tags.map((tag) => (
          <button
            key={tag}
            className={`tag-chip ${activeTag === tag ? "active" : ""}`}
            onClick={() => onSelect(activeTag === tag ? null : tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
