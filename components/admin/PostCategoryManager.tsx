"use client";

import { useState } from "react";

// Per-list manager for the SET of post-category names (internal only). Used in
// both the "Add a T-List" form and the list settings. This is distinct from the
// LIST's own category (which groups T-Lists on the admin home).
export default function PostCategoryManager({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const name = draft.trim().slice(0, 60);
    if (!name) return;
    if (value.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, name]);
    setDraft("");
  }

  function remove(name: string) {
    onChange(value.filter((c) => c !== name));
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="e.g. Ticker Tuesday"
          maxLength={60}
        />
        <button type="button" className="adm-btn secondary" onClick={add}>
          Add
        </button>
      </div>
      {value.length > 0 ? (
        <div className="cat-chips">
          {value.map((c) => (
            <span className="cat-chip" key={c}>
              {c}
              <button
                type="button"
                className="cat-chip-x"
                aria-label={`Remove ${c}`}
                onClick={() => remove(c)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="hint">No post categories yet for this list.</div>
      )}
    </div>
  );
}
