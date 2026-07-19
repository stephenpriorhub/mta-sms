"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PostPreview from "@/components/admin/PostPreview";

interface PostForm {
  title: string;
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

const empty = (): PostForm => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return {
    title: "",
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

export default function PostEditor({
  listId,
  postId,
}: {
  listId: string;
  postId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<PostForm>(empty());
  const [loading, setLoading] = useState(!!postId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [listName, setListName] = useState("");
  const [listLogo, setListLogo] = useState<string | null>(null);

  // Load the list (for the preview header) — logo + name.
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/lists/${listId}`);
      if (res.ok) {
        const { list } = await res.json();
        setListName(list.name);
        setListLogo(list.logoUrl ?? null);
      }
    })();
  }, [listId]);

  useEffect(() => {
    if (!postId) return;
    (async () => {
      const res = await fetch(`/api/admin/posts/${postId}`);
      if (res.ok) {
        const { post } = await res.json();
        setForm({
          title: post.title ?? "",
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

  async function insertImage(file: File) {
    setUploading(true);
    setErr("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) {
      const { url } = await res.json();
      set("content", `${form.content}\n<img src="${url}" alt="" />\n`);
    } else {
      setErr("Image upload failed");
    }
  }

  async function save() {
    setSaving(true);
    setErr("");
    const payload = {
      listId,
      title: form.title,
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
    if (res.ok) router.push(`/admin/lists/${listId}`);
    else setErr((await res.json()).error || "Save failed");
  }

  if (loading) return <p className="muted">Loading…</p>;

  const scheduled = new Date(form.publishDate).getTime() > Date.now();

  return (
    <>
      <p className="muted">
        <Link href={`/admin/lists/${listId}`}>← Back to list</Link>
      </p>
      <h1>{postId ? "Edit post" : "New post"}</h1>

      <div className="adm-card">
        <label>Title (optional)</label>
        <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)} />

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
        <textarea
          value={form.content}
          onChange={(e) => set("content", e.target.value)}
          placeholder="Body HTML — supports links and inline images."
        />
        <div className="hint">HTML supported: paragraphs, links, images, bold, lists.</div>
        <div className="adm-actions">
          <label className="adm-btn secondary" style={{ cursor: "pointer", margin: 0 }}>
            {uploading ? "Uploading…" : "Upload image"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && insertImage(e.target.files[0])}
            />
          </label>
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
          {saving ? "Saving…" : "Save post"}
        </button>
        <Link className="adm-btn secondary" href={`/admin/lists/${listId}`}>
          Cancel
        </Link>
      </div>
      {err && <div className="adm-err">{err}</div>}

      <h2>Live preview</h2>
      <div className="hint" style={{ marginBottom: 10 }}>
        How this post will render on its public page. Updates as you edit.
      </div>
      <PostPreview values={form} logoUrl={listLogo} listName={listName} />
    </>
  );
}
