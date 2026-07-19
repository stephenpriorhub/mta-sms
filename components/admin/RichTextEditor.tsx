"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeContentHtml, sanitizeHtml } from "@/lib/content";

// Lightweight, dependency-free rich-text editor built on contenteditable +
// execCommand. It is ADMIN-ONLY, so it adds ZERO client JS to the public pages.
// It produces clean, semantic HTML (<p>, <br>, <strong>, <em>, <u>, <a>, <img>,
// <table>) that the public <PublicPost> renders directly.
//
// - Enter        => new paragraph (<p>) with visible spacing
// - Shift+Enter  => soft line break (<br>)
// Both persist on save because we store the editor's innerHTML.

// Tags kept when pasting external HTML; everything else is unwrapped to text.
const PASTE_ALLOWED = new Set([
  "P", "BR", "B", "STRONG", "I", "EM", "U", "A", "UL", "OL", "LI",
  "TABLE", "THEAD", "TBODY", "TR", "TD", "TH", "H2", "H3", "SPAN", "DIV",
]);

/** Strip pasted HTML down to a safe, clean subset (client-side, DOMParser). */
function cleanPastedHtml(html: string): string {
  const doc = new DOMParser().parseFromString(sanitizeHtml(html), "text/html");
  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        walk(el);
        if (!PASTE_ALLOWED.has(el.tagName)) {
          // Unwrap: replace the element with its children.
          while (el.firstChild) node.insertBefore(el.firstChild, el);
          node.removeChild(el);
        } else {
          // Keep only meaningful attributes.
          const keep =
            el.tagName === "A"
              ? ["href"]
              : el.tagName === "IMG"
              ? ["src", "alt"]
              : [];
          for (const attr of Array.from(el.attributes)) {
            if (!keep.includes(attr.name.toLowerCase())) el.removeAttribute(attr.name);
          }
        }
      }
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

export default function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState("");

  // Seed the editor with the incoming value only when it isn't focused, so we
  // never clobber the caret while the author is typing. This also migrates
  // legacy plain-text content to paragraphs on first load.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const html = normalizeContentHtml(value) || "<p><br></p>";
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [value]);

  // Prefer semantic tags (<b>/<i>) over inline styles, and make Enter produce <p>.
  useEffect(() => {
    try {
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {
      /* not supported everywhere; contenteditable still works */
    }
  }, []);

  function sync() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    sync();
  }

  function anchorInSelection(): HTMLAnchorElement | null {
    const sel = window.getSelection();
    let node: Node | null = sel?.anchorNode ?? null;
    while (node) {
      if (node.nodeName === "A") return node as HTMLAnchorElement;
      node = node.parentNode;
    }
    return null;
  }

  function addLink() {
    ref.current?.focus();
    const existing = anchorInSelection();
    const current = existing?.getAttribute("href") || "https://";
    const url = window.prompt("Link URL", current);
    if (url === null) return;
    if (!url.trim()) {
      document.execCommand("unlink");
      sync();
      return;
    }
    const sel = window.getSelection();
    if (sel && sel.isCollapsed && !existing) {
      // No selection: insert the URL as its own linked text.
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${url}">${url}</a>`
      );
    } else if (existing) {
      existing.setAttribute("href", url);
    } else {
      document.execCommand("createLink", false, url);
    }
    sync();
  }

  async function onPickImage(file: File) {
    setUploading(true);
    setNote("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) {
      const { url } = await res.json();
      ref.current?.focus();
      document.execCommand("insertHTML", false, `<img src="${url}" alt="" />`);
      sync();
    } else {
      setNote("Image upload failed");
    }
  }

  function currentCell(): HTMLTableCellElement | null {
    const sel = window.getSelection();
    let node: Node | null = sel?.anchorNode ?? null;
    while (node) {
      if (node.nodeName === "TD" || node.nodeName === "TH")
        return node as HTMLTableCellElement;
      node = node.parentNode;
    }
    return null;
  }

  function insertTable() {
    ref.current?.focus();
    const html =
      '<table><thead><tr><th>Header 1</th><th>Header 2</th></tr></thead>' +
      "<tbody><tr><td>Cell</td><td>Cell</td></tr>" +
      "<tr><td>Cell</td><td>Cell</td></tr></tbody></table><p><br></p>";
    document.execCommand("insertHTML", false, html);
    sync();
  }

  function tableOp(op: "addRow" | "delRow" | "addCol" | "delCol") {
    const cell = currentCell();
    if (!cell) {
      setNote("Place the cursor inside a table first.");
      return;
    }
    setNote("");
    const row = cell.parentElement as HTMLTableRowElement;
    const table = cell.closest("table") as HTMLTableElement;
    const colIndex = Array.from(row.cells).indexOf(cell);
    const allRows = Array.from(table.querySelectorAll("tr"));

    if (op === "addRow") {
      const newRow = document.createElement("tr");
      for (let i = 0; i < row.cells.length; i++) {
        const td = document.createElement("td");
        td.textContent = "Cell";
        newRow.appendChild(td);
      }
      row.after(newRow);
    } else if (op === "delRow") {
      if (allRows.length > 1) row.remove();
    } else if (op === "addCol") {
      for (const r of allRows) {
        const isHead = r.parentElement?.tagName === "THEAD";
        const c = document.createElement(isHead ? "th" : "td");
        c.textContent = isHead ? "Header" : "Cell";
        const ref2 = (r as HTMLTableRowElement).cells[colIndex];
        if (ref2) ref2.after(c);
        else r.appendChild(c);
      }
    } else if (op === "delCol") {
      for (const r of allRows) {
        const c = (r as HTMLTableRowElement).cells[colIndex];
        if (c && (r as HTMLTableRowElement).cells.length > 1) c.remove();
      }
    }
    sync();
  }

  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    if (html) {
      document.execCommand("insertHTML", false, cleanPastedHtml(html));
    } else if (text) {
      // Convert plain-text newlines to paragraphs/breaks so pasted text keeps spacing.
      document.execCommand("insertHTML", false, normalizeContentHtml(text));
    }
    sync();
  }

  const Btn = ({
    onClick,
    label,
    title,
  }: {
    onClick: () => void;
    label: string;
    title: string;
  }) => (
    <button
      type="button"
      className="rte-btn"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div className="rte">
      <div className="rte-toolbar">
        <Btn onClick={() => exec("bold")} label="B" title="Bold" />
        <Btn onClick={() => exec("italic")} label="I" title="Italic" />
        <Btn onClick={() => exec("underline")} label="U" title="Underline" />
        <span className="rte-sep" />
        <Btn onClick={addLink} label="Link" title="Insert/edit link" />
        <Btn
          onClick={() => fileRef.current?.click()}
          label={uploading ? "Uploading…" : "Image"}
          title="Insert image"
        />
        <span className="rte-sep" />
        <Btn onClick={insertTable} label="Table" title="Insert table" />
        <Btn onClick={() => tableOp("addRow")} label="+Row" title="Add row" />
        <Btn onClick={() => tableOp("delRow")} label="−Row" title="Delete row" />
        <Btn onClick={() => tableOp("addCol")} label="+Col" title="Add column" />
        <Btn onClick={() => tableOp("delCol")} label="−Col" title="Delete column" />
      </div>

      <div
        ref={ref}
        className="rte-area"
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        onPaste={onPaste}
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && onPickImage(e.target.files[0])}
      />
      {note && <div className="hint" style={{ color: "#b42318" }}>{note}</div>}
    </div>
  );
}
