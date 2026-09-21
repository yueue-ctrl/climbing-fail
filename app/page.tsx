"use client";

import { type CSSProperties, SyntheticEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { upload as uploadBlob } from "@vercel/blob/client";
import { fileToGif, type CaptionPosition } from "@/lib/gif";

type Meme = {
  id: string;
  category: string;
  url: string;
  filename: string;
  likes: number;
  commentCount?: number;
  latestComment?: { author: string; body: string };
  createdAt?: number;
  uploaded?: boolean;
};
type Comment = { id: number; author: string; body: string; createdAt: number };
const ADMIN_PAGE_SIZE = 5;
const IDLE_SCATTER_MS = 10_000;

function shuffle<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapWith]] = [shuffled[swapWith], shuffled[index]];
  }
  return shuffled;
}

function arrangeMemes(items: Meme[]) {
  const latest = items
    .filter((item) => item.uploaded)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];
  if (!latest) return shuffle(items);
  return [latest, ...shuffle(items.filter((item) => item.id !== latest.id))];
}

function getColumnCount() {
  return window.innerWidth <= 600 ? 2 : window.innerWidth <= 800 ? 3 : window.innerWidth <= 1100 ? 4 : 5;
}

function subscribeToResize(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function scatterStyle(meme: Meme, index: number) {
  let hash = 0;
  for (const character of meme.id) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  const value = Math.abs(hash);
  const row = Math.floor(index / 4);
  return {
    "--scatter-x": `${3 + value % 76}%`,
    "--scatter-x-mobile": `${2 + value % 54}%`,
    "--scatter-y": `${28 + row * 245 + (value >> 4) % 125}px`,
    "--scatter-r": `${-11 + (value >> 8) % 23}deg`,
    "--scatter-scale": `${0.86 + ((value >> 12) % 20) / 100}`,
  } as CSSProperties;
}

export default function Home() {
  const [memes, setMemes] = useState<Meme[]>([]);
  const [selected, setSelected] = useState<Meme | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [shareMedia, setShareMedia] = useState<{ key: string; file: File | null } | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPage, setAdminPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [adminComments, setAdminComments] = useState<Record<string, Comment[]>>({});
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [captionPosition, setCaptionPosition] = useState<CaptionPosition>("middle");
  const [captionScale, setCaptionScale] = useState(1);
  const [gravityUndone, setGravityUndone] = useState(false);
  const [organized, setOrganized] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const columnCount = useSyncExternalStore(subscribeToResize, getColumnCount, () => 5);
  const fileRef = useRef<HTMLInputElement>(null);
  const pressedKeys = useRef(new Set<string>());
  const shareKey = selected ? `${selected.id}:${gravityUndone ? "reverse" : "normal"}` : "";

  useEffect(() => {
    let active = true;
    fetch("/api/memes")
      .then(async (response) => response.ok ? await response.json() as Meme[] : [])
      .then((items) => { if (active) setMemes(arrangeMemes(items)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!selected) return;
    fetch(`/api/memes/${selected.id}/comments`)
      .then(async (response) => (response.ok ? (await response.json()) as Comment[] : []))
      .then(setComments)
      .catch(() => setComments([]));
  }, [selected]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    const key = `${selected.id}:${gravityUndone ? "reverse" : "normal"}`;
    const source = `/api/media/${encodeURIComponent(selected.id)}${gravityUndone ? "?reverse=1" : ""}`;
    fetch(source)
      .then(async (response) => {
        if (!response.ok) throw new Error("MEDIA COULD NOT BE READ");
        const blob = await response.blob();
        const baseName = selected.filename.replace(/\.gif$/i, "");
        return new File([blob], `${gravityUndone ? "reversed-" : ""}${baseName}.gif`, { type: "image/gif" });
      })
      .then((file) => { if (active) setShareMedia({ key, file }); })
      .catch(() => { if (active) setShareMedia({ key, file: null }); });
    return () => { active = false; };
  }, [selected, gravityUndone]);
  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      pressedKeys.current.add(event.key.toLowerCase());
      if (pressedKeys.current.has("z") && pressedKeys.current.has("y")) {
        event.preventDefault();
        setAdminPage(1);
        setAdminOpen(true);
      }
      if (event.key === "Escape") setAdminOpen(false);
    }
    function keyUp(event: KeyboardEvent) {
      pressedKeys.current.delete(event.key.toLowerCase());
    }
    function clearKeys() { pressedKeys.current.clear(); }
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clearKeys);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clearKeys);
    };
  }, []);
  useEffect(() => {
    if (!adminOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [adminOpen]);
  useEffect(() => {
    if (!organized) return;
    let timer = window.setTimeout(() => setOrganized(false), IDLE_SCATTER_MS);
    const stayOrganized = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setOrganized(false), IDLE_SCATTER_MS);
    };
    const events: (keyof WindowEventMap)[] = ["pointermove", "pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, stayOrganized, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, stayOrganized));
    };
  }, [organized]);

  function chooseFile(file: File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCaption("");
    setCaptionPosition("middle");
    setCaptionScale(1);
    setPreviewUrl(URL.createObjectURL(file));
    setPendingFile(file);
  }

  function closeEditor() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setPendingFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function upload() {
    if (!pendingFile) return;
    const file = pendingFile;
    const text = caption;
    const position = captionPosition;
    const textScale = captionScale;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setPendingFile(null);
    setUploading(true);
    try {
      setProgress("PROCESSING... 0%");
      const gif = await fileToGif(file, (value) => setProgress(`PROCESSING... ${value}%`), text, position, textScale);
      setProgress("UPLOADING...");
      const id = crypto.randomUUID();
      const filename = file.name.replace(/\.[^.]+$/, "") + ".gif";
      const blob = await uploadBlob(`uploads/${id}.gif`, gif, {
        access: "public",
        contentType: "image/gif",
        handleUploadUrl: "/api/upload",
      });
      const response = await fetch("/api/memes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, filename, pathname: blob.pathname, url: blob.url }),
      });
      if (!response.ok) throw new Error(await response.text());
      const saved = (await response.json()) as Meme;
      setMemes((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
      setProgress("DONE");
    } catch (error) {
      setProgress(error instanceof Error ? error.message.toUpperCase() : "UPLOAD FAILED");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(() => setProgress(""), 2400);
    }
  }

  async function like() {
    if (!selected) return;
    const response = await fetch(`/api/memes/${selected.id}/like`, { method: "POST" });
    if (!response.ok) return;
    const { likes } = (await response.json()) as { likes: number };
    setMemes((items) => items.map((item) => (item.id === selected.id ? { ...item, likes } : item)));
    setSelected((item) => (item ? { ...item, likes } : item));
  }

  async function comment(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const response = await fetch(`/api/memes/${selected.id}/comments`, {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    if (!response.ok) return;
    const saved = (await response.json()) as Comment;
    setComments((items) => [...items, saved]);
    setMemes((items) => items.map((item) => item.id === selected.id ? {
      ...item,
      commentCount: (item.commentCount ?? 0) + 1,
      latestComment: { author: saved.author, body: saved.body },
    } : item));
    setSelected((item) => item ? {
      ...item,
      commentCount: (item.commentCount ?? 0) + 1,
      latestComment: { author: saved.author, body: saved.body },
    } : item);
    event.currentTarget.reset();
  }

  async function saveToPhotos() {
    if (!selected) return;
    const readyFile = shareMedia?.key === shareKey ? shareMedia.file : null;
    if (readyFile && navigator.share) {
      const shareData = { files: [readyFile], title: "Climbing Fail" };
      if (!navigator.canShare || navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }
    }
    const source = `/api/media/${encodeURIComponent(selected.id)}${gravityUndone ? "?reverse=1" : ""}`;
    window.open(source, "_blank", "noopener,noreferrer");
  }

  async function removeMeme(meme: Meme) {
    if (!window.confirm(`DELETE ${meme.filename}?`)) return;
    setDeletingId(meme.id);
    try {
      const response = await fetch(`/api/memes/${meme.id}`, {
        method: "DELETE",
        headers: { "x-admin-trigger": "zy" },
      });
      if (!response.ok) throw new Error(await response.text());
      setMemes((items) => items.filter((item) => item.id !== meme.id));
      setAdminPage((page) => Math.min(page, Math.max(1, Math.ceil((memes.length - 1) / ADMIN_PAGE_SIZE))));
      setSelected((item) => item?.id === meme.id ? null : item);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "DELETE FAILED");
    } finally {
      setDeletingId(null);
    }
  }

  async function removeComment(meme: Meme, item: Comment) {
    if (!window.confirm(`DELETE COMMENT BY ${item.author}?`)) return;
    setDeletingCommentId(item.id);
    try {
      const response = await fetch(`/api/comments/${item.id}`, {
        method: "DELETE",
        headers: { "x-admin-trigger": "zy" },
      });
      if (!response.ok) throw new Error(await response.text());
      const summary = await response.json() as {
        memeId: string;
        commentCount: number;
        latestComment?: { author: string; body: string };
      };
      setAdminComments((items) => ({
        ...items,
        [meme.id]: (items[meme.id] ?? []).filter((comment) => comment.id !== item.id),
      }));
      setComments((items) => selected?.id === meme.id ? items.filter((comment) => comment.id !== item.id) : items);
      setMemes((items) => items.map((entry) => entry.id === summary.memeId ? {
        ...entry,
        commentCount: summary.commentCount,
        latestComment: summary.latestComment,
      } : entry));
      setSelected((entry) => entry?.id === summary.memeId ? {
        ...entry,
        commentCount: summary.commentCount,
        latestComment: summary.latestComment,
      } : entry);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "COMMENT DELETE FAILED");
    } finally {
      setDeletingCommentId(null);
    }
  }

  const adminPageCount = Math.max(1, Math.ceil(memes.length / ADMIN_PAGE_SIZE));
  const safeAdminPage = Math.min(adminPage, adminPageCount);
  const adminMemes = memes.slice((safeAdminPage - 1) * ADMIN_PAGE_SIZE, safeAdminPage * ADMIN_PAGE_SIZE);
  const memeSource = (meme: Meme) => gravityUndone
    ? `/api/media/${encodeURIComponent(meme.id)}?reverse=1`
    : meme.url;

  useEffect(() => {
    if (!adminOpen) return;
    let active = true;
    const pageMemes = memes.slice((safeAdminPage - 1) * ADMIN_PAGE_SIZE, safeAdminPage * ADMIN_PAGE_SIZE);
    Promise.all(pageMemes.map(async (meme) => {
      const response = await fetch(`/api/memes/${meme.id}/comments`);
      const items = response.ok ? await response.json() as Comment[] : [];
      return [meme.id, items] as const;
    })).then((entries) => {
      if (active) setAdminComments((items) => ({ ...items, ...Object.fromEntries(entries) }));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [adminOpen, safeAdminPage, memes]);

  return (
    <main>
      <header>
        <div className="brand">
          <h1><span>{gravityUndone ? "GRAVITY: 0," : "GRAVITY: 1,"}</span><span>{gravityUndone ? "US: 1" : "US: 0"}</span></h1>
          <p className="subtitle">A CLIMBING FAIL MEME COLLECTION BY YUE &amp; FRIENDS</p>
        </div>
        <div className="header-actions">
          <button className="reverse-all" type="button" aria-pressed={gravityUndone}
            onClick={() => setGravityUndone((value) => !value)}>
            {gravityUndone ? "RESTORE GRAVITY" : "UNDO GRAVITY"}
          </button>
          <label className="upload">
            {uploading ? progress : "UPLOAD"}
            <input ref={fileRef} type="file" accept=".mov,video/quicktime,video/mp4,video/webm,image/*" disabled={uploading}
              onChange={(event) => event.target.files?.[0] && chooseFile(event.target.files[0])} />
          </label>
        </div>
      </header>

      {progress && <div className="status">{progress}</div>}
      {pendingFile && previewUrl && (
        <dialog open className="meme-editor" aria-label="Edit meme text">
          <section className="editor-panel">
            <div className="editor-preview">
              {pendingFile.type.startsWith("video/") || /\.mov$/i.test(pendingFile.name) ? (
                <video src={previewUrl} autoPlay muted loop playsInline />
              ) : (
                // oxlint-disable-next-line next/no-img-element
                <img src={previewUrl} alt="Meme preview" />
              )}
              {caption.trim() && <p className={`caption-preview caption-${captionPosition}`}
                style={{ fontSize: `clamp(${1.6 * captionScale}rem, ${4.2 * captionScale}vw, ${4 * captionScale}rem)` }}>
                {caption}
              </p>}
            </div>
            <div className="editor-tools">
              <label>
                MEME TEXT
                <textarea value={caption} onChange={(event) => setCaption(event.target.value)}
                  placeholder="TYPE SOMETHING..." maxLength={180} autoFocus />
              </label>
              <div className="caption-position" aria-label="Text position">
                {(["top", "middle", "bottom"] as CaptionPosition[]).map((position) => (
                  <button type="button" className={captionPosition === position ? "active" : ""}
                    key={position} onClick={() => setCaptionPosition(position)}>{position.toUpperCase()}</button>
                ))}
              </div>
              <label className="caption-size">
                <span>TEXT SIZE <b>{Math.round(captionScale * 100)}%</b></span>
                <input type="range" min="0.6" max="1.6" step="0.1" value={captionScale}
                  onChange={(event) => setCaptionScale(Number(event.target.value))} />
              </label>
              <div className="editor-actions">
                <button type="button" onClick={closeEditor}>CANCEL</button>
                <button type="button" onClick={upload}>MAKE GIF</button>
              </div>
            </div>
          </section>
        </dialog>
      )}
      <section className={`gallery ${organized ? "organized" : "scattered"}`}
        style={{
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
          "--scatter-height": `${Math.max(720, Math.ceil(memes.length / 4) * 245 + 170)}px`,
        } as CSSProperties}
        aria-label={organized ? "Climbing fail GIFs" : "Scattered climbing fail GIFs — click to arrange"}>
        {!organized && <button className="arrange-trigger" type="button" onClick={() => setOrganized(true)}>
          ARRANGE GIFS
        </button>}
        {Array.from({ length: columnCount }, (_, column) => (
          <div className="gallery-column" key={column}>
            {memes.map((meme, index) => ({ meme, index }))
              .filter(({ index }) => index % columnCount === column)
              .map(({ meme, index }) => (
              <button className="tile" key={meme.id} style={organized ? undefined : scatterStyle(meme, index)}
                onClick={() => setSelected(meme)} aria-label="Open GIF">
                {/* oxlint-disable-next-line next/no-img-element */}
                <img src={memeSource(meme)} alt="Looping climbing fail" />
                {meme.latestComment && (
                  <span className="tile-comment">
                    <b>{meme.latestComment.author}</b> {meme.latestComment.body}
                    {(meme.commentCount ?? 0) > 1 && <small>+{(meme.commentCount ?? 1) - 1} MORE</small>}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </section>

      {selected && (
        <dialog open className="overlay" aria-label="GIF details">
          <article className="detail">
            <button className="close" type="button" onClick={(event) => {
              event.stopPropagation();
              setSelected(null);
            }} aria-label="Close">×</button>
            {/* oxlint-disable-next-line next/no-img-element */}
            <img src={memeSource(selected)} alt="Looping climbing fail" />
            <div className="actions">
              <button onClick={like}>♥ {selected.likes}</button>
              <button onClick={saveToPhotos} disabled={shareMedia?.key !== shareKey}>
                {shareMedia?.key !== shareKey ? "PREPARING..." : "SAVE TO PHOTOS"}
              </button>
              <a href={`/api/media/${encodeURIComponent(selected.id)}?download=1${gravityUndone ? "&reverse=1" : ""}`}>DOWNLOAD</a>
            </div>
            <div className="comments">
              {comments.map((item) => <p key={item.id}><b>{item.author}</b> {item.body}</p>)}
              <form onSubmit={comment}>
                <input name="author" aria-label="Name" placeholder="NAME" maxLength={24} required />
                <input name="body" aria-label="Comment" placeholder="COMMENT" maxLength={180} required />
                <button type="submit">POST</button>
              </form>
            </div>
          </article>
        </dialog>
      )}
      {adminOpen && (
        <dialog open className="admin-console" aria-label="Backstage controls">
          <section className="admin-panel">
            <header className="admin-header">
              <h2>BACKSTAGE / Z+Y</h2>
              <button type="button" onClick={() => setAdminOpen(false)} aria-label="Close backstage">×</button>
            </header>
            <nav className="admin-pagination" aria-label="Backstage pages">
              <p>{memes.length} {memes.length === 1 ? "UPLOAD" : "UPLOADS"}</p>
              <div>
                <button type="button" disabled={safeAdminPage === 1}
                  onClick={() => setAdminPage((page) => Math.max(1, page - 1))}>PREV</button>
                <span>{safeAdminPage} / {adminPageCount}</span>
                <button type="button" disabled={safeAdminPage === adminPageCount}
                  onClick={() => setAdminPage((page) => Math.min(adminPageCount, page + 1))}>NEXT</button>
              </div>
            </nav>
            <div className="admin-list">
              {memes.length === 0 && <p>NO UPLOADS</p>}
              {adminMemes.map((meme) => (
                <article className="admin-item" key={meme.id}>
                  {/* oxlint-disable-next-line next/no-img-element */}
                  <img src={meme.url} alt="" />
                  <div>
                    <p>{meme.filename}</p>
                    <small>♥ {meme.likes}</small>
                  </div>
                  <button type="button" disabled={deletingId === meme.id} onClick={() => removeMeme(meme)}>
                    {deletingId === meme.id ? "DELETING..." : "DELETE"}
                  </button>
                  <div className="admin-comments">
                    <small>{meme.commentCount ?? 0} {(meme.commentCount ?? 0) === 1 ? "COMMENT" : "COMMENTS"}</small>
                    {(meme.commentCount ?? 0) > 0 && !adminComments[meme.id] && <p>LOADING COMMENTS...</p>}
                    {(adminComments[meme.id] ?? []).map((item) => (
                      <div className="admin-comment" key={item.id}>
                        <p><b>{item.author}</b> {item.body}</p>
                        <button type="button" disabled={deletingCommentId === item.id}
                          onClick={() => removeComment(meme, item)}>
                          {deletingCommentId === item.id ? "DELETING..." : "DELETE COMMENT"}
                        </button>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </dialog>
      )}
      <footer className="site-footer">
        <p className="community-note">FOR OUR SMALL CIRCLE. PLEASE KEEP THIS SPACE KIND. CONTACT YUE IF THERE IS A PROBLEM.</p>
        <p className="font-credit">© Xiaoyuan Gao / notyourtypefoundry. All rights reserved.</p>
      </footer>
    </main>
  );
}
