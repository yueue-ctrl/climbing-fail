const seedMemes = [
  {
    id: 1,
    climber: "CLIMBER 01",
    type: "脚滑",
    caption: "脚先走了，身体后来才收到通知。",
    location: "SESSION 01 · LIVE LOOP",
    video: "assets/fail-01.mov",
    likes: 23
  },
  {
    id: 2,
    climber: "CLIMBER 02",
    type: "核心下班",
    caption: "核心已读，但决定不回。",
    location: "SESSION 02 · LIVE LOOP",
    video: "assets/fail-02.mov",
    likes: 41
  },
  {
    id: 3,
    climber: "CLIMBER 03",
    type: "重力胜利",
    caption: "手还在努力，人已经接受现实。",
    location: "SESSION 03 · LIVE LOOP",
    video: "assets/fail-03.mov",
    likes: 36
  },
  {
    id: 4,
    climber: "CLIMBER 04",
    type: "重力胜利",
    caption: "起跳很有想法，落地很有结果。",
    location: "SESSION 04 · LIVE LOOP",
    video: "assets/fail-04.mov",
    likes: 18
  },
  {
    id: 5,
    climber: "CLIMBER 05",
    type: "脚滑",
    caption: "这个脚点和我的未来一样：看得见，踩不住。",
    location: "SESSION 05 · LIVE LOOP",
    video: "assets/fail-05.mov",
    likes: 52
  }
];

const stored = JSON.parse(localStorage.getItem("climbing-fail-memes") || "[]");
let memes = [...stored, ...seedMemes];
let activeFilter = "all";

const grid = document.querySelector("#memeGrid");
const empty = document.querySelector("#emptyState");
const dialog = document.querySelector("#uploadDialog");
const form = document.querySelector("#uploadForm");
const imageInput = document.querySelector("#imageInput");
const preview = document.querySelector("#imagePreview");
const dropCopy = document.querySelector(".drop-copy");
const toast = document.querySelector("#toast");

function escapeHTML(value) {
  const node = document.createElement("div");
  node.textContent = String(value);
  return node.innerHTML;
}

function render() {
  const visible = activeFilter === "all" ? memes : memes.filter(meme => meme.type === activeFilter);
  grid.innerHTML = visible.map((meme, index) => {
    const media = meme.video
      ? `<video src="${meme.video}" autoplay muted loop playsinline preload="metadata" aria-label="${escapeHTML(meme.climber)} 的攀岩掉落短视频"></video>`
      : `<img src="${meme.image}" alt="${escapeHTML(meme.climber)} 的攀岩掉落瞬间" />`;
    return `
    <article class="meme-card" data-id="${meme.id}" style="animation-delay:${index * 70}ms">
      <div class="card-image">
        ${media}
        <span class="incident-no">CF-${String(meme.id).padStart(3, "0")}</span>
        <span class="fail-label">${escapeHTML(meme.type)}</span>
      </div>
      <div class="card-body">
        <div class="card-meta"><span>SUBJECT: ${escapeHTML(meme.climber)}</span><span>SAFE ✓</span></div>
        <p class="card-caption">“${escapeHTML(meme.caption)}”</p>
        <div class="card-footer">
          <span>${escapeHTML(meme.location || "LOCATION UNKNOWN")}</span>
          <button class="like-btn" data-like="${meme.id}" aria-label="给这次掉落鼓掌">👏 <span>${meme.likes}</span></button>
        </div>
      </div>
    </article>
  `}).join("");
  empty.hidden = visible.length > 0;
  document.querySelector("#allCount").textContent = String(memes.length).padStart(2, "0");
}

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
    render();
  });
});

grid.addEventListener("click", event => {
  const button = event.target.closest("[data-like]");
  if (!button) return;
  const meme = memes.find(item => item.id === Number(button.dataset.like));
  const isLiked = button.classList.toggle("liked");
  meme.likes += isLiked ? 1 : -1;
  button.querySelector("span").textContent = meme.likes;
});

document.querySelector("#randomBtn").addEventListener("click", () => {
  const cards = [...document.querySelectorAll(".meme-card")];
  if (!cards.length) return;
  const card = cards[Math.floor(Math.random() * cards.length)];
  cards.forEach(item => item.classList.remove("spotlight"));
  card.classList.add("spotlight");
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => card.classList.remove("spotlight"), 2200);
});

document.querySelectorAll("[data-open-upload]").forEach(button => button.addEventListener("click", () => dialog.showModal()));
document.querySelectorAll("[data-close-upload]").forEach(button => button.addEventListener("click", () => dialog.close()));
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    preview.src = reader.result;
    preview.hidden = false;
    dropCopy.hidden = true;
  };
  reader.readAsDataURL(file);
});

form.addEventListener("submit", event => {
  event.preventDefault();
  if (!form.reportValidity() || !preview.src) return;
  const data = new FormData(form);
  const meme = {
    id: Date.now(),
    climber: data.get("climber").toUpperCase(),
    type: data.get("type"),
    caption: data.get("caption"),
    location: (data.get("location") || "FRIENDS SESSION").toUpperCase(),
    image: preview.src,
    likes: 0
  };
  const userMemes = [meme, ...stored];
  try { localStorage.setItem("climbing-fail-memes", JSON.stringify(userMemes)); } catch (_) {}
  memes.unshift(meme);
  activeFilter = "all";
  document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item.dataset.filter === "all"));
  render();
  dialog.close();
  form.reset();
  preview.hidden = true;
  preview.removeAttribute("src");
  dropCopy.hidden = false;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
});

render();
