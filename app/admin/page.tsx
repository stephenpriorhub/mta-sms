"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { normalizeSlug, isValidSlug, randomSlug } from "@/lib/slug";

interface ListRow {
  id: string;
  name: string;
  slug: string;
  _count: { posts: number; pageViews: number };
}

export default function AdminDashboard() {
  const [lists, setLists] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/lists");
    if (res.ok) setLists((await res.json()).lists);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!isValidSlug(slug)) {
      setErr("Slug must be exactly 5 lowercase letters or numbers.");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/admin/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });
    setCreating(false);
    if (res.ok) {
      setName("");
      setSlug("");
      load();
    } else {
      setErr((await res.json()).error || "Failed to create list");
    }
  }

  return (
    <>
      <h1>T-Letter Lists</h1>
      <p className="muted">Each list is a fully isolated public page at /[slug].</p>

      <h2>Create a list</h2>
      <div className="adm-card">
        <form onSubmit={create}>
          <label>List name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Trade of the Day"
            required
          />
          <label>Slug (exactly 5 characters)</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(normalizeSlug(e.target.value))}
              placeholder="abc12"
              maxLength={5}
              pattern="[a-z0-9]{5}"
              required
              style={{ fontFamily: "monospace", letterSpacing: ".08em" }}
            />
            <button
              type="button"
              className="adm-btn secondary"
              onClick={() => setSlug(randomSlug())}
            >
              Generate
            </button>
          </div>
          <div className="hint">
            Public URL will be /{slug || "xxxxx"} — exactly 5 lowercase letters or
            numbers, unique per list.
            {slug && !isValidSlug(slug) && (
              <span style={{ color: "#b42318" }}> (needs 5 characters)</span>
            )}
          </div>
          <div className="adm-actions">
            <button className="adm-btn" disabled={creating}>
              {creating ? "Creating…" : "Create list"}
            </button>
          </div>
          {err && <div className="adm-err">{err}</div>}
        </form>
      </div>

      <h2>All lists</h2>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : lists.length === 0 ? (
        <p className="muted">No lists yet.</p>
      ) : (
        <table className="adm-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>URL</th>
              <th>Posts</th>
              <th>Views</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lists.map((l) => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td>
                  <a href={`/${l.slug}`} target="_blank" rel="noreferrer">
                    /{l.slug}
                  </a>
                </td>
                <td>{l._count.posts}</td>
                <td>{l._count.pageViews}</td>
                <td>
                  <Link href={`/admin/lists/${l.id}`}>Manage</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
