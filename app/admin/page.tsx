"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { normalizeSlug, isValidSlug, randomSlug } from "@/lib/slug";
import { publicListUrl } from "@/lib/site";
import PostCategoryManager from "@/components/admin/PostCategoryManager";
import PostEditor from "@/components/admin/PostEditor";

interface ListRow {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  archivesEnabled: boolean;
  _count: { posts: number; pageViews: number };
}

export default function AdminHome() {
  const [lists, setLists] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Add a T-List (inline form)
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [postCategories, setPostCategories] = useState<string[]>([]);
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
    setPostCategories([]);
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
        postCategories,
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

  return (
    <>
      {/* PRIMARY ACTION: the full create-post form, inline at the very top. */}
      <PostEditor lists={lists} onCreated={load} />

      <div className="adm-actions" style={{ marginTop: 22 }}>
        <a className="adm-btn secondary" href="#your-tlists">
          ↓ Jump to your T-Lists
        </a>
      </div>

      {/* ADD A T-LIST */}
      <h2>Add a T-List</h2>
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

            <label>Post Categories (tag posts in this list · internal only)</label>
            <PostCategoryManager
              value={postCategories}
              onChange={setPostCategories}
            />
            <div className="hint">
              The set of categories you can tag posts with (e.g. “Ticker Tuesday”).
              Per-list and never shown publicly.
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

      {/* EXISTING T-LISTS (flat list — no category grouping). */}
      <h2 id="your-tlists" style={{ scrollMarginTop: 16 }}>
        Your T-Lists
      </h2>
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lists.map((l) => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td>
                  <a href={publicListUrl(l.slug)} target="_blank" rel="noreferrer">
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
      )}
    </>
  );
}
