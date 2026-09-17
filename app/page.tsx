"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { fileToPixelGif } from "@/lib/gif";

type Meme = { id: string; category: string; url: string; filename: string; likes: number };
type Comment = { id: number; author: string; body: string; createdAt: number };
const categories = ["ALL", "SLIP", "SWING", "GRAVITY", "OTHER"];

export default function Home() {
  const [memes, setMemes] = useState<Meme[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState<Meme | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadMemes() {
    const response = await fetch("/api/memes");
    if (response.ok) setMemes(await response.json());
  }

  useEffect(() => { loadMemes().catch(() => undefined); }, []);
  useEffect(() => {
    if (!selected) return;
    fetch(`/api/memes/${selected.id}/comments`)
      .then(async (response) => (response.ok ? (await response.json()) as Comment[] : []))
      .then(setComments)
      .catch(() => setComments([]));
  }, [selected]);

  const visible = useMemo(
    () => (filter === "ALL" ? memes : memes.filter((meme) => meme.category === filter)),
    [filter, memes],
  );

  async function upload(file: File) {
    setUploading(true);
    try {
      setProgress("LOADING");
      const gif = await fileToPixelGif(file, (value) => setProgress(`PROCESSING ${value}%`));
      setProgress("UPLOADING");
      const form = new FormData();
      form.set("file", gif, file.name.replace(/\.[^.]+$/, "") + ".gif");
      form.set("category", filter === "ALL" ? "OTHER" : filter);
      const response = await fetch("/api/memes", { method: "POST", body: form });
      if (!response.ok) throw new Error(await response.text());
      await loadMemes();
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

  async function comment(event: FormEvent<HTMLFormElement>) {
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

  return (
    <main>
      <header>
        <div className="brand">
          <h1>CLIMBING FAIL</h1>
          <p className="subtitle">YUE &amp; HER CLIMBING FRIENDS</p>
        </div>
        <label className="upload">
          {uploading ? progress : "+ ADD"}
          <input ref={fileRef} type="file" accept=".mov,video/quicktime,video/mp4,video/webm,image/*" disabled={uploading}
            onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} />
        </label>
      </header>

      <nav aria-label="Categories">
        {categories.map((category) => (
          <button key={category} className={filter === category ? "active" : ""} onClick={() => setFilter(category)}>
            {category}
          </button>
        ))}
      </nav>

      {progress && <div className="status">{progress}</div>}
      <section className="grid" aria-label="Climbing fail GIFs">
        {visible.map((meme) => (
          <button className="tile" key={meme.id} onClick={() => setSelected(meme)} aria-label="Open GIF">
            <img src={meme.url} alt="Looping climbing fail" />
          </button>
        ))}
      </section>

      {selected && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="GIF details"
          onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <article className="detail">
            <button className="close" onClick={() => setSelected(null)} aria-label="Close">×</button>
            <img src={selected.url} alt="Looping climbing fail" />
            <div className="actions">
              <button onClick={like}>♥ {selected.likes}</button>
              <a href={`${selected.url}?download=1`} download={selected.filename}>DOWNLOAD</a>
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
        </div>
      )}
    </main>
  );
}
