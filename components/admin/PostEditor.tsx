"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PostPreview from "@/components/admin/PostPreview";
import RichTextEditor from "@/components/admin/RichTextEditor";

interface PostForm {
  title: string;
  category: string;
  publishDate: string; // datetime-local value
  content: string;
  topAdEnabled: boolean;
  topAdText: string;
  topAdLink: string;
  actionToTake: string;
  actionSecondary: string;
  buttonText: string;
  buttonUrl: string;
}

export interface ListOption {
  id: string;
  name: string;
  slug: string;
}

const empty = (): PostForm => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return {
    title: "",
    category: "",
    publishDate: now.toISOString().slice(0, 16),
    content: "",
    topAdEnabled: false,
    topAdText: "",
    topAdLink: "",
    actionToTake: "",
    actionSecondary: "",
    buttonText: "",
    buttonUrl: "",
  };
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "9px 11px",
  font: "inherit",
  background: "#fff",
  color: "var(--ink)",
};

export default function PostEditor({
  listId,
  postId,
  lists,
  onCreated,
  headerAction,
}: {
  // Per-list mode: listId fixed. Home mode: omit listId and pass `lists` so the
  // publisher first picks which T-Letter to post into.
  listId?: string;
  postId?: string;
  lists?: ListOption[];
  onCreated?: () => void;
  headerAction?: React.ReactNode;
}) {
  const router = useRouter();
  const homeMode = !!lists;

  const [activeListId, setActiveListId] = useState(listId ?? "");
  const [form, setForm] = useState<PostForm>(empty());
  const [loading, setLoading] = useState(!!postId);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [listName, setListName] = useState("");
  const [listLogo, setListLogo] = useState<string | null>(null);
  const [listCategories, setListCategories] = useState<string[]>([]);

  // Load the active list (preview header + this list's post categories).
  useEffect(() => {
    if (!activeListId) {
      setListName("");
      setListLogo(null);
      setListCategories([]);
      return;
    }
    (async () => {
      const res = await fetch(`/api/admin/lists/${activeListId}`);
      if (res.ok) {
        const { list } = await res.json();
        setListName(list.name);
        setListLogo(list.logoUrl ?? null);
        setListCategories(list.postCategories ?? []);
      }
    })();
  }, [activeListId]);

  useEffect(() => {
    if (!postId) return;
    (async () => {
      const res = await fetch(`/api/admin/posts/${postId}`);
      if (res.ok) {
        const { post } = await res.json();
        setForm({
          title: post.title ?? "",
          category: post.category ?? "",
          publishDate: toLocalInput(post.publishDate),
          content: post.content ?? "",
          topAdEnabled: !!post.topAdEnabled,
          topAdText: post.topAdText ?? "",
          topAdLink: post.topAdLink ?? "",
          actionToTake: post.actionToTake ?? "",
          actionSecondary: post.actionSecondary ?? "",
          buttonText: post.buttonText ?? "",
          buttonUrl: post.buttonUrl ?? "",
        });
      }
      setLoading(false);
    })();
  }, [postId]);

  function set<K extends keyof PostForm>(k: K, v: PostForm[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function chooseList(id: string) {
    setActiveListId(id);
    // Categories are per-list, so a stale tag from another list must be cleared.
    set("category", "");
    setErr("");
  }

  function resetForm() {
    setForm(empty());
    if (homeMode) setActiveListId("");
    setErr("");
    setMsg("");
  }

  async function save() {
    if (!activeListId) {
      setErr("Choose a T-Letter to post into.");
      return;
    }
    setSaving(true);
    setErr("");
    setMsg("");
    const payload = {
      listId: activeListId,
      title: form.title,
      category: form.category || null,
      publishDate: new Date(form.publishDate).toISOString(),
      content: form.content,
      topAdEnabled: form.topAdEnabled,
      topAdText: form.topAdText,
      topAdLink: form.topAdLink,
      actionToTake: form.actionToTake,
      actionSecondary: form.actionSecondary,
      buttonText: form.buttonText,
      buttonUrl: form.buttonUrl,
    };
    const res = await fetch(
      postId ? `/api/admin/posts/${postId}` : "/api/admin/posts",
      {
        method: postId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setSaving(false);
    if (!res.ok) {
      setErr((await res.json()).error || "Save failed");
      return;
    }
    if (homeMode) {
      // Stay on the home; confirm and reset so the publisher can post again.
      setMsg("Post created.");
      resetForm();
      onCreated?.();
    } else {
      router.push(`/admin/lists/${activeListId}`);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;

  const scheduled = new Date(form.publishDate).getTime() > Date.now();

  return (
    <>
      {homeMode ? (
        <div className="adm-hd-row">
          <h1>New Post</h1>
          {headerAction}
        </div>
      ) : (
        <>
          <p className="muted">
            <Link href={`/admin/lists/${listId}`}>← Back to list</Link>
          </p>
          <h1>{postId ? "Edit post" : "New post"}</h1>
        </>
      )}

      <div className="adm-card">
        {homeMode && (
          <>
            <label>Post into which T-Letter</label>
            <select
              value={activeListId}
              onChange={(e) => chooseList(e.target.value)}
              style={selectStyle}
              aria-label="Post into which T-Letter"
            >
              <option value="">Choose a T-Letter…</option>
              {lists!.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} (/{l.slug})
                </option>
              ))}
            </select>
            <div className="hint">
              Determines where the post is created and which post categories are
              available.
            </div>
          </>
        )}

        <label>Title (optional)</label>
        <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)} />

        <label>Category (internal only)</label>
        {activeListId && listCategories.length > 0 ? (
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            style={selectStyle}
          >
            <option value="">— None —</option>
            {listCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : (
          <div className="hint">
            {!activeListId
              ? "Choose a T-Letter above to see its post categories."
              : "No post categories defined for this list yet. Add them in the list’s settings to tag posts."}
          </div>
        )}
        <div className="hint">
          For internal organization only — never shown on the public page.
        </div>

        <label>Publish date</label>
        <input
          type="datetime-local"
          value={form.publishDate}
          onChange={(e) => set("publishDate", e.target.value)}
        />
        <div className="hint">
          {scheduled
            ? "In the future — this post will be scheduled and hidden until then."
            : "Defaults to now. Set a future date to schedule."}
        </div>

        <label>Content</label>
        <RichTextEditor
          value={form.content}
          onChange={(html) => set("content", html)}
        />
        <div className="hint">
          Use the toolbar for bold, italic, underline, links, images, and tables.
          Enter starts a new paragraph; Shift+Enter is a line break.
        </div>
      </div>

      <h2>Top Text Ad (optional)</h2>
      <div className="adm-card">
        <div className="hint">
          Renders as the 2-line light-grey box at the very top of this post’s public page.
        </div>
        <div className="checkline">
          <input
            type="checkbox"
            id="topad"
            checked={form.topAdEnabled}
            onChange={(e) => set("topAdEnabled", e.target.checked)}
          />
          <label htmlFor="topad">Enable Top Text Ad</label>
        </div>
        {form.topAdEnabled && (
          <>
            <label>Top Text Ad Text</label>
            <textarea
              value={form.topAdText}
              onChange={(e) => set("topAdText", e.target.value)}
              style={{ minHeight: 60 }}
              placeholder="Two-line promotional text…"
            />
            <label>Top Text Ad Link (optional)</label>
            <input
              type="url"
              value={form.topAdLink}
              onChange={(e) => set("topAdLink", e.target.value)}
              placeholder="https://…"
            />
            <div className="hint">Box shows when enabled and text is present; the link is optional.</div>
          </>
        )}
      </div>

      <h2>Action To Take box (optional)</h2>
      <div className="adm-card">
        <div className="hint">Leave empty to hide the entire box.</div>
        <label>Action To Take</label>
        <textarea
          value={form.actionToTake}
          onChange={(e) => set("actionToTake", e.target.value)}
          style={{ minHeight: 90 }}
          placeholder="e.g. Buy XYZ under $50."
        />
        <label>Secondary line (optional)</label>
        <input
          type="text"
          value={form.actionSecondary}
          onChange={(e) => set("actionSecondary", e.target.value)}
        />
        <label>Button text (optional)</label>
        <input
          type="text"
          value={form.buttonText}
          onChange={(e) => set("buttonText", e.target.value)}
        />
        <label>Button URL (optional)</label>
        <input
          type="url"
          value={form.buttonUrl}
          onChange={(e) => set("buttonUrl", e.target.value)}
          placeholder="https://…"
        />
        <div className="hint">Button renders only if both text and URL are set.</div>
      </div>

      <div className="adm-actions">
        <button className="adm-btn" onClick={save} disabled={saving}>
          {saving ? "Saving…" : homeMode ? "Create post" : "Save post"}
        </button>
        {homeMode ? (
          <button className="adm-btn secondary" onClick={resetForm} disabled={saving}>
            Clear
          </button>
        ) : (
          <Link className="adm-btn secondary" href={`/admin/lists/${listId}`}>
            Cancel
          </Link>
        )}
      </div>
      {msg && <div className="adm-toast">{msg}</div>}
      {err && <div className="adm-err">{err}</div>}

      <h2>Live preview</h2>
      <div className="hint" style={{ marginBottom: 10 }}>
        How this post will render on its public page. Updates as you edit.
      </div>
      <PostPreview values={form} logoUrl={listLogo} listName={listName} />
    </>
  );
}
