"use client";

import { SyntheticEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { upload as uploadBlob } from "@vercel/blob/client";
import { fileToPixelGif } from "@/lib/gif";

type Meme = {
  id: string;
  category: string;
  url: string;
  filename: string;
  likes: number;
  createdAt?: number;
  uploaded?: boolean;
};
type Comment = { id: number; author: string; body: string; createdAt: number };

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

export default function Home() {
  const [memes, setMemes] = useState<Meme[]>([]);
  const [selected, setSelected] = useState<Meme | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [adminOpen, setAdminOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const columnCount = useSyncExternalStore(subscribeToResize, getColumnCount, () => 5);
  const fileRef = useRef<HTMLInputElement>(null);
  const pressedKeys = useRef(new Set<string>());

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
    function keyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      pressedKeys.current.add(event.key.toLowerCase());
      if (pressedKeys.current.has("z") && pressedKeys.current.has("y")) {
        event.preventDefault();
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

  async function upload(file: File) {
    setUploading(true);
    try {
      setProgress("PROCESSING... 0%");
      const gif = await fileToPixelGif(file, (value) => setProgress(`PROCESSING... ${value}%`));
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
    event.currentTarget.reset();
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
      setSelected((item) => item?.id === meme.id ? null : item);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "DELETE FAILED");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main>
      <header>
        <div className="brand">
          <h1><span>GRAVITY: 1,</span><span>US: 0</span></h1>
          <p className="subtitle">A CLIMBING FAIL MEME COLLECTION BY YUE &amp; FRIENDS</p>
        </div>
        <label className="upload">
          {uploading ? progress : "UPLOAD"}
          <input ref={fileRef} type="file" accept=".mov,video/quicktime,video/mp4,video/webm,image/*" disabled={uploading}
            onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} />
        </label>
      </header>

      {progress && <div className="status">{progress}</div>}
      <section className="gallery" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }} aria-label="Climbing fail GIFs">
        {Array.from({ length: columnCount }, (_, column) => (
          <div className="gallery-column" key={column}>
            {memes.filter((_, index) => index % columnCount === column).map((meme) => (
              <button className="tile" key={meme.id} onClick={() => setSelected(meme)} aria-label="Open GIF">
                {/* oxlint-disable-next-line next/no-img-element */}
                <img src={meme.url} alt="Looping climbing fail" />
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
            <img src={selected.url} alt="Looping climbing fail" />
            <div className="actions">
              <button onClick={like}>♥ {selected.likes}</button>
              <a href={`/api/media/${encodeURIComponent(selected.id)}?download=1`}>DOWNLOAD</a>
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
            <div className="admin-list">
              {memes.length === 0 && <p>NO UPLOADS</p>}
              {memes.map((meme) => (
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
