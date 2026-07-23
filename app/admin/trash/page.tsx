"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface TrashPost {
  id: string;
  title: string | null;
  deletedAt: string;
  listId: string;
  listName: string;
  listSlug: string;
  listDeleted: boolean;
}
interface TrashList {
  id: string;
  name: string;
  slug: string;
  deletedAt: string;
  posts: number;
}

function when(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function RecycleBin() {
  const [posts, setPosts] = useState<TrashPost[]>([]);
  const [lists, setLists] = useState<TrashList[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>(""); // id currently being acted on
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/trash");
    if (res.ok) {
      const d = await res.json();
      setPosts(d.posts);
      setLists(d.lists);
    } else {
      setErr("Could not load the Recycle Bin.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function flash(m: string) {
    setMsg(m);
    setErr("");
    window.setTimeout(() => setMsg(""), 4000);
  }

  async function restorePost(p: TrashPost) {
    setBusy(p.id);
    const res = await fetch(`/api/admin/trash/posts/${p.id}`, { method: "POST" });
    setBusy("");
    if (res.ok) {
      const d = await res.json();
      flash(
        d.listStillDeleted
          ? `Restored "${p.title || "Untitled"}". Its list is still in the bin, so it stays hidden until you restore the list "${p.listName}".`
          : `Restored "${p.title || "Untitled"}".`
      );
      load();
    } else setErr("Restore failed.");
  }

  async function purgePost(p: TrashPost) {
    if (
      !confirm(
        `Permanently delete "${p.title || "Untitled"}"?\n\nThis CANNOT be undone — the post is gone for good.`
      )
    )
      return;
    setBusy(p.id);
    const res = await fetch(`/api/admin/trash/posts/${p.id}`, {
      method: "DELETE",
    });
    setBusy("");
    if (res.ok) {
      flash("Post permanently deleted.");
      load();
    } else setErr("Permanent delete failed.");
  }

  async function restoreList(l: TrashList) {
    setBusy(l.id);
    const res = await fetch(`/api/admin/trash/lists/${l.id}`, {
      method: "POST",
    });
    setBusy("");
    if (res.ok) {
      flash(`Restored the list "${l.name}" and its ${l.posts} post(s).`);
      load();
    } else setErr("Restore failed.");
  }

  async function purgeList(l: TrashList) {
    // Type-to-confirm: cascades to EVERY post in the list.
    const typed = prompt(
      `Permanently delete the ENTIRE list "${l.name}" (/${l.slug}) and ALL of its posts?\n\nThis CANNOT be undone. Type the slug "${l.slug}" to confirm.`
    );
    if (typed == null) return;
    if (typed.trim() !== l.slug) {
      setErr(`Did not delete "${l.name}" — the slug you typed did not match.`);
      return;
    }
    setBusy(l.id);
    const res = await fetch(`/api/admin/trash/lists/${l.id}`, {
      method: "DELETE",
    });
    setBusy("");
    if (res.ok) {
      flash(`List "${l.name}" and all its posts permanently deleted.`);
      load();
    } else setErr("Permanent delete failed.");
  }

  const empty = posts.length === 0 && lists.length === 0;

  return (
    <>
      <p className="muted">
        <Link href="/admin">← Back to admin</Link>
      </p>
      <h1>Recycle Bin</h1>
      <p className="muted">
        Deleted posts and lists are kept here so nothing is lost by accident.
        Restore an item to bring it back, or permanently delete it (that step
        cannot be undone). Items stay here until you remove them — there is no
        auto-expiry.
      </p>

      {msg && <div className="adm-toast">{msg}</div>}
      {err && <div className="adm-err">{err}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : empty ? (
        <div className="adm-card">
          <p className="muted" style={{ margin: 0 }}>
            The Recycle Bin is empty.
          </p>
        </div>
      ) : (
        <>
          <h2>Deleted lists</h2>
          {lists.length === 0 ? (
            <p className="muted">No deleted lists.</p>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>URL</th>
                  <th>Posts</th>
                  <th>Deleted</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lists.map((l) => (
                  <tr key={l.id}>
                    <td>{l.name}</td>
                    <td>
                      <code>/{l.slug}</code>
                    </td>
                    <td>{l.posts}</td>
                    <td>{when(l.deletedAt)}</td>
                    <td>
                      <a
                        onClick={() => busy !== l.id && restoreList(l)}
                        style={{
                          cursor: busy === l.id ? "default" : "pointer",
                          color: "var(--accent)",
                        }}
                      >
                        Restore
                      </a>
                    </td>
                    <td>
                      <a
                        onClick={() => busy !== l.id && purgeList(l)}
                        style={{
                          cursor: busy === l.id ? "default" : "pointer",
                          color: "#b42318",
                        }}
                      >
                        Delete permanently
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2>Deleted posts</h2>
          {posts.length === 0 ? (
            <p className="muted">No deleted posts.</p>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>List</th>
                  <th>Deleted</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td>{p.title || "Untitled"}</td>
                    <td>
                      {p.listName}{" "}
                      {p.listDeleted && (
                        <span className="adm-badge warn">list deleted</span>
                      )}
                    </td>
                    <td>{when(p.deletedAt)}</td>
                    <td>
                      <a
                        onClick={() => busy !== p.id && restorePost(p)}
                        style={{
                          cursor: busy === p.id ? "default" : "pointer",
                          color: "var(--accent)",
                        }}
                      >
                        Restore
                      </a>
                    </td>
                    <td>
                      <a
                        onClick={() => busy !== p.id && purgePost(p)}
                        style={{
                          cursor: busy === p.id ? "default" : "pointer",
                          color: "#b42318",
                        }}
                      >
                        Delete permanently
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  );
}
