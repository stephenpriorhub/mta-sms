"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { normalizeSlug, isValidSlug, randomSlug } from "@/lib/slug";
import { publicListUrl, publicPostUrl } from "@/lib/site";
import PostCategoryManager from "@/components/admin/PostCategoryManager";

interface Post {
  id: string;
  title: string | null;
  category: string | null;
  publishDate: string;
}
interface ListData {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  postCategories: string[];
  archivesEnabled: boolean;
  posts: Post[];
}
interface Analytics {
  totals: { views: number; clicks: number };
  posts: {
    id: string;
    title: string | null;
    views: number;
    links: { url: string; label: string | null; clicks: number }[];
  }[];
}

export default function ManageList() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [list, setList] = useState<ListData | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [postFilter, setPostFilter] = useState<string>(""); // "" = all

  const load = useCallback(async () => {
    const [l, a] = await Promise.all([
      fetch(`/api/admin/lists/${id}`),
      fetch(`/api/admin/analytics?listId=${id}`),
    ]);
    if (l.ok) setList((await l.json()).list);
    if (a.ok) setAnalytics(await a.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function set<K extends keyof ListData>(k: K, v: ListData[K]) {
    setList((prev) => (prev ? { ...prev, [k]: v } : prev));
  }

  async function uploadLogo(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    if (res.ok) set("logoUrl", (await res.json()).url);
    else setErr("Logo upload failed");
  }

  async function save() {
    if (!list) return;
    if (!isValidSlug(list.slug)) {
      setErr("Slug must be exactly 5 lowercase letters or numbers.");
      return;
    }
    setSaving(true);
    setErr("");
    setMsg("");
    const res = await fetch(`/api/admin/lists/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(list),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Saved.");
      load();
    } else setErr((await res.json()).error || "Save failed");
  }

  async function delPost(postId: string) {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/admin/posts/${postId}`, { method: "DELETE" });
    load();
  }

  async function delList() {
    if (!confirm("Delete this ENTIRE list and all its posts? This cannot be undone."))
      return;
    const res = await fetch(`/api/admin/lists/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin");
  }

  if (!list) return <p className="muted">Loading…</p>;

  const clicksFor = (postId: string) =>
    analytics?.posts.find((p) => p.id === postId);

  return (
    <>
      <p className="muted">
        <Link href="/admin">← All lists</Link>
      </p>
      <h1>{list.name}</h1>
      <p className="muted">
        Public page:{" "}
        <a href={publicListUrl(list.slug)} target="_blank" rel="noreferrer">
          {publicListUrl(list.slug)}
        </a>
      </p>

      <h2>Settings</h2>
      <div className="adm-card">
        <label>List name</label>
        <input type="text" value={list.name} onChange={(e) => set("name", e.target.value)} />

        <label>Slug (exactly 5 characters)</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            value={list.slug}
            onChange={(e) => set("slug", normalizeSlug(e.target.value))}
            maxLength={5}
            pattern="[a-z0-9]{5}"
            style={{ fontFamily: "monospace", letterSpacing: ".08em" }}
          />
          <button
            type="button"
            className="adm-btn secondary"
            onClick={() => set("slug", randomSlug())}
          >
            Generate
          </button>
        </div>
        <div className="hint">
          Changing the slug changes the public URL (/{list.slug || "xxxxx"}).
          {list.slug && !isValidSlug(list.slug) && (
            <span style={{ color: "#b42318" }}> Needs exactly 5 characters.</span>
          )}
        </div>

        <label>Logo</label>
        {list.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={list.logoUrl}
            alt="logo"
            style={{ maxHeight: 40, background: "#0f2440", padding: 8, borderRadius: 6, display: "block", marginBottom: 8 }}
          />
        ) : (
          <div className="hint">Using default MTA cream logo.</div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
        />
        {list.logoUrl && (
          <div className="adm-actions">
            <button className="adm-btn secondary" onClick={() => set("logoUrl", null)}>
              Remove logo (use default)
            </button>
          </div>
        )}

        <label>Post Categories (tag posts in this list · internal only)</label>
        <PostCategoryManager
          value={list.postCategories ?? []}
          onChange={(next) => set("postCategories", next)}
        />
        <div className="hint">
          The set of categories you can tag posts in this list with (e.g. “Ticker
          Tuesday”). Per-list and never shown publicly.
        </div>

        <div className="checkline">
          <input
            type="checkbox"
            id="arch"
            checked={list.archivesEnabled}
            onChange={(e) => set("archivesEnabled", e.target.checked)}
          />
          <label htmlFor="arch">Enable “View Archives” accordion</label>
        </div>

        <div className="adm-actions">
          <button className="adm-btn" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </button>
          <button className="adm-btn danger" onClick={delList}>
            Delete list
          </button>
        </div>
        {msg && <div className="adm-toast">{msg}</div>}
        {err && <div className="adm-err">{err}</div>}
      </div>

      <h2>Posts</h2>
      <div
        className="adm-actions"
        style={{ marginTop: 0, marginBottom: 12, alignItems: "center" }}
      >
        <Link className="adm-btn" href={`/admin/lists/${id}/posts/new`}>
          + New post
        </Link>
        {list.postCategories.length > 0 && (
          <label style={{ margin: 0, display: "flex", gap: 8, alignItems: "center" }}>
            <span className="hint" style={{ margin: 0 }}>
              Filter by category
            </span>
            <select
              value={postFilter}
              onChange={(e) => setPostFilter(e.target.value)}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "7px 10px",
                font: "inherit",
                background: "#fff",
              }}
            >
              <option value="">All</option>
              {list.postCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__none">Uncategorized</option>
            </select>
          </label>
        )}
      </div>
      {list.posts.length === 0 ? (
        <p className="muted">No posts yet.</p>
      ) : (
        <table className="adm-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Publish date</th>
              <th>Views</th>
              <th>Clicks</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.posts
              .filter((p) =>
                postFilter === ""
                  ? true
                  : postFilter === "__none"
                  ? !p.category
                  : p.category === postFilter
              )
              .map((p) => {
              const scheduled = new Date(p.publishDate).getTime() > Date.now();
              const stats = clicksFor(p.id);
              return (
                <tr key={p.id}>
                  <td>
                    {p.title || "Untitled"}{" "}
                    {scheduled && <span className="adm-badge warn">Scheduled</span>}
                  </td>
                  <td>
                    {p.category ? (
                      <span className="adm-badge cat">{p.category}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{new Date(p.publishDate).toLocaleDateString()}</td>
                  <td>{stats?.views ?? 0}</td>
                  <td>{stats?.links.reduce((s, l) => s + l.clicks, 0) ?? 0}</td>
                  <td>
                    <a
                      href={publicPostUrl(list.slug, p.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View
                    </a>
                    {"  "}
                    <Link href={`/admin/lists/${id}/posts/${p.id}`}>Edit</Link>
                  </td>
                  <td>
                    <a onClick={() => delPost(p.id)} style={{ cursor: "pointer", color: "#b42318" }}>
                      Delete
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2>Analytics</h2>
      <div className="adm-card">
        <div className="adm-row">
          <span className="muted">Total page views</span>
          <strong>{analytics?.totals.views ?? 0}</strong>
        </div>
        <div className="adm-row" style={{ marginTop: 8 }}>
          <span className="muted">Total link clicks</span>
          <strong>{analytics?.totals.clicks ?? 0}</strong>
        </div>
      </div>
      {analytics?.posts.map(
        (p) =>
          p.links.length > 0 && (
            <div className="adm-card" key={p.id}>
              <strong>{p.title || "Untitled"}</strong> — {p.views} views
              <table className="adm-table" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Link</th>
                    <th>Label</th>
                    <th>Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {p.links.map((l, i) => (
                    <tr key={i}>
                      <td style={{ wordBreak: "break-all", maxWidth: 380 }}>{l.url}</td>
                      <td>{l.label || "—"}</td>
                      <td>{l.clicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}
    </>
  );
}
