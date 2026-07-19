"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { normalizeSlug, isValidSlug, randomSlug } from "@/lib/slug";

interface ListRow {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  logoUrl: string | null;
  archivesEnabled: boolean;
  _count: { posts: number; pageViews: number };
}

const UNCATEGORIZED = "Uncategorized";

export default function AdminHome() {
  const router = useRouter();
  const [lists, setLists] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);

  // New Post hero
  const [selectedListId, setSelectedListId] = useState("");

  // Add a T-List (inline form)
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [archivesEnabled, setArchivesEnabled] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/lists");
    if (res.ok) setLists((await res.json()).lists);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function composePost() {
    if (!selectedListId) return;
    router.push(`/admin/lists/${selectedListId}/posts/new`);
  }

  async function uploadLogo(file: File) {
    setErr("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    if (res.ok) setLogoUrl((await res.json()).url);
    else setErr("Logo upload failed");
  }

  function resetCreate() {
    setName("");
    setSlug("");
    setCategory("");
    setLogoUrl(null);
    setArchivesEnabled(false);
    setErr("");
  }

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
      body: JSON.stringify({
        name,
        slug,
        category: category || null,
        logoUrl,
        archivesEnabled,
      }),
    });
    setCreating(false);
    if (res.ok) {
      resetCreate();
      setShowCreate(false);
      load();
    } else {
      setErr((await res.json()).error || "Failed to create list");
    }
  }

  // Group existing lists by internal category (admin-only organization).
  const grouped = useMemo(() => {
    const map = new Map<string, ListRow[]>();
    for (const l of lists) {
      const key = l.category?.trim() || UNCATEGORIZED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === UNCATEGORIZED) return 1;
      if (b === UNCATEGORIZED) return -1;
      return a.localeCompare(b);
    });
  }, [lists]);

  return (
    <>
      {/* HERO: creating a post is the primary action. */}
      <div className="adm-hero">
        <h1>New Post</h1>
        <p className="muted">
          Pick the T-List this post belongs to, then compose it.
        </p>
        <div className="adm-hero-row">
          <select
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            aria-label="Choose a T-List"
          >
            <option value="">Choose a T-List…</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} (/{l.slug})
              </option>
            ))}
          </select>
          <button
            className="adm-btn big"
            onClick={composePost}
            disabled={!selectedListId}
          >
            Compose post →
          </button>
        </div>
        {lists.length === 0 && !loading && (
          <div className="hint" style={{ marginTop: 10 }}>
            No T-Lists yet — add one below first.
          </div>
        )}
      </div>

      {/* ADD A T-LIST */}
      <div className="adm-actions" style={{ marginTop: 0 }}>
        <button
          className="adm-btn secondary"
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? "Cancel" : "+ Add a T-List"}
        </button>
      </div>

      {showCreate && (
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
              Public URL will be /{slug || "xxxxx"} — exactly 5 lowercase letters
              or numbers, unique per list.
              {slug && !isValidSlug(slug) && (
                <span style={{ color: "#b42318" }}> (needs 5 characters)</span>
              )}
            </div>

            <label>Category (internal only)</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. War Room, Free lists…"
            />
            <div className="hint">
              For your organization only — never shown on any public page.
            </div>

            <label>Logo (optional)</label>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="logo"
                style={{
                  maxHeight: 40,
                  background: "#0f2440",
                  padding: 8,
                  borderRadius: 6,
                  display: "block",
                  marginBottom: 8,
                }}
              />
            ) : (
              <div className="hint">Defaults to the MTA cream logo.</div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
            />

            <div className="checkline">
              <input
                type="checkbox"
                id="arch-new"
                checked={archivesEnabled}
                onChange={(e) => setArchivesEnabled(e.target.checked)}
              />
              <label htmlFor="arch-new">Enable “View Archives” accordion</label>
            </div>

            <div className="adm-actions">
              <button className="adm-btn" disabled={creating}>
                {creating ? "Creating…" : "Create T-List"}
              </button>
            </div>
            {err && <div className="adm-err">{err}</div>}
          </form>
        </div>
      )}

      {/* EXISTING T-LISTS */}
      <h2>Your T-Lists</h2>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : lists.length === 0 ? (
        <p className="muted">No lists yet.</p>
      ) : (
        grouped.map(([cat, rows]) => (
          <div key={cat}>
            <div className="adm-cat-head">{cat}</div>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>URL</th>
                  <th>Posts</th>
                  <th>Views</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
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
                      <Link href={`/admin/lists/${l.id}`}>Past posts</Link>
                    </td>
                    <td>
                      <Link href={`/admin/lists/${l.id}`}>Edit list</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </>
  );
}
