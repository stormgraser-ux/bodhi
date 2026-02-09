import { useState, useRef, useEffect } from "react";

interface TagInputProps {
  tags: string[];
  allTags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, allTags, onChange }: TagInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = input
    ? allTags.filter((t) => t.includes(input.toLowerCase()) && !tags.includes(t))
    : [];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const addTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase();
    if (normalized && !tags.includes(normalized)) {
      onChange([...tags, normalized]);
    }
    setInput("");
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleBlur = () => {
    if (input.trim()) {
      addTag(input);
    }
  };

  return (
    <div className="tag-input">
      <div className="tag-input-tags">
        {tags.map((tag) => (
          <span key={tag} className="tag-badge removable" onClick={() => removeTag(tag)}>
            {tag} &times;
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          placeholder={tags.length === 0 ? "Add tags..." : ""}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="tag-suggestions">
          {suggestions.map((s) => (
            <button key={s} className="tag-suggestion" onClick={() => addTag(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
