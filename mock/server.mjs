// techlog 백엔드(Gin) 모의 서버. 백엔드(Postgres·S3·GitHub OAuth) 없이 화면을 띄우고 시험할 때 쓴다.
// 글 원고 저장소(choigonyok/techlog-posts)를 읽어 데이터를 만든다. 실제 서버의 버릇을 따라 한다:
//  - 제목/부제 40자 초과, 태그에 작은따옴표가 있으면 저장하지 않고도 200 을 보낸다.
//  - 없는 글을 물으면 200 과 빈 글을 보낸다.
//  - 썸네일이 없으면 빈 200 을 보낸다.
//  - /api/visitor 를 부를 때마다 오늘 방문 수를 올린다.
//  - 관리자 토큰은 dev-token 이 통과, intruder-token 은 403, 나머지는 401(만료)이다.
//  - 제목에 '실패시험'이 들어가면 저장하지 않고 200 을 보낸다(조용한 실패 화면 시험용).
// 사용: node mock/server.mjs <posts-dir> [--static <build-dir>] [--delay ms]
//   API 는 :8787, --static 을 주면 빌드 결과를 :3000 에서 내준다(SPA 주소는 index.html 로).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const postsDir = args[0];
const staticDir = args.includes("--static") ? args[args.indexOf("--static") + 1] : null;
const delay = args.includes("--delay") ? Number(args[args.indexOf("--delay") + 1]) : 0;
const API_PORT = Number(process.env.API_PORT || 8787);
const WEB_PORT = Number(process.env.WEB_PORT || 3000);
const log = [];

function uuidFrom(text) {
  const h = crypto.createHash("sha1").update(text).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function parsePost(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  const meta = {};
  let i = 0;
  for (; i < Math.min(lines.length, 10); i += 1) {
    const m = /^\s*\[(ID|Tags|Title|WriteTime|ImageNames|Subtitle):\s?(.*)\]\s*$/.exec(lines[i]);
    if (m) meta[m[1]] = m[2].trim();
    else if (lines[i].trim() === "" && Object.keys(meta).length) continue;
    else if (Object.keys(meta).length) break;
  }
  if (!meta.Title) return null;
  const text = lines.slice(i).join("\n").replace(/^\s+/, "");
  const tags = (meta.Tags || "").split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
  return {
    id: uuidFrom(path.basename(file)),
    title: meta.Title,
    subtitle: meta.Subtitle || "",
    writeTime: meta.WriteTime || "",
    tags,
    text,
    thumbnail: { type: "generated" },
  };
}

const posts = new Map();
for (const name of fs.readdirSync(postsDir)) {
  if (!name.endsWith(".md") || name === "README.md") continue;
  const p = parsePost(path.join(postsDir, name));
  if (p) posts.set(p.id, p);
}
// 썸네일이 없는 글 하나를 만들어 둔다(빈 응답 처리 확인용).
const noThumb = [...posts.values()].find((p) => p.title.includes("Makefile"));
if (noThumb) noThumb.thumbnail = null;

let visitors = { today: 11, total: 34566 };

function card(p) {
  return { id: p.id, tags: p.tags, title: p.title, subtitle: p.subtitle, writeTime: p.writeTime, thumbnail_name: "", text: "", images: null };
}

// UUID 순으로 내보낸다(실제 서버의 ORDER BY id desc 와 같은 무작위 순서).
function list(tag) {
  let all = [...posts.values()].sort((a, b) => (a.id < b.id ? 1 : -1));
  if (tag && tag !== "ALL") {
    const want = tag.split(",");
    all = all.filter((p) => p.tags.some((t) => want.includes(t)));
  }
  return all.map(card);
}

function thumbSvg(p) {
  const h = parseInt(p.id.slice(0, 6), 16);
  const hue = 200 + (h % 40);
  const x = 40 + (h % 500);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},38%,22%)"/><stop offset="1" stop-color="hsl(${hue + 12},30%,34%)"/></linearGradient></defs>
<rect width="1200" height="675" fill="url(#g)"/>
<g stroke="hsl(${hue},40%,70%)" stroke-opacity=".35" fill="none" stroke-width="2"><circle cx="${x + 300}" cy="320" r="160"/><circle cx="${x + 520}" cy="260" r="90"/><path d="M${x} 600 L${x + 300} 320 L${x + 520} 260 L1100 120"/></g>
<text x="64" y="600" font-family="Helvetica, Arial" font-size="44" fill="#e4eaf3" fill-opacity=".9">${p.title.replace(/[<&>]/g, "")}</text></svg>`;
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-type");
}

async function body(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

async function formOf(req) {
  const buf = await body(req);
  const r = new Request("http://x/", { method: "POST", headers: { "content-type": req.headers["content-type"] }, body: buf });
  return r.formData();
}

function len(s) {
  return Array.from(s || "").length;
}

async function savePost(target, form, isNew) {
  const data = JSON.parse(form.get("data") || "{}");
  const file = form.get("file");
  // 실제 서버처럼 조용히 실패한다.
  if (len(data.title) > 40 || len(data.subtitle) > 40) return { ok: false, why: "varchar(40)" };
  if ((data.tags || []).some((t) => String(t).includes("'"))) return { ok: false, why: "quote in tag" };
  // 시험용: 본문 이미지 내려받기 실패처럼, 제목에 '실패시험'이 있으면 저장하지 않는다.
  if (String(data.title).includes("실패시험")) return { ok: false, why: "simulated failure" };
  const post = target || { id: crypto.randomUUID(), writeTime: new Date().toISOString().slice(0, 10), thumbnail: null };
  post.title = data.title;
  post.subtitle = data.subtitle;
  post.tags = (data.tags || []).filter((t) => t !== "");
  post.text = data.text;
  if (file && typeof file !== "string" && data.thumbnail_name && file.name === data.thumbnail_name) {
    post.thumbnail = { type: file.type || "application/octet-stream", bytes: Buffer.from(await file.arrayBuffer()), name: file.name };
  }
  if (isNew) posts.set(post.id, post);
  return { ok: true, id: post.id };
}

const api = http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") return res.writeHead(204).end();
  if (delay) await new Promise((r) => setTimeout(r, delay));
  const url = new URL(req.url, `http://localhost:${API_PORT}`);
  const p = url.pathname;
  const json = (code, obj) => {
    res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
    res.end(obj === undefined ? "" : JSON.stringify(obj));
  };
  log.push(`${req.method} ${p}${url.search}`);
  try {
    if (req.method === "GET" && p === "/api/posts") return json(200, list(url.searchParams.get("tag") || ""));
    if (req.method === "GET" && p === "/api/tags") {
      const counts = {};
      for (const post of posts.values()) for (const t of post.tags) counts[t] = (counts[t] || 0) + 1;
      return json(200, [{ name: "ALL", count: posts.size }, ...Object.entries(counts).map(([name, count]) => ({ name, count }))]);
    }
    if (req.method === "GET" && p === "/api/visitor") {
      visitors = { today: visitors.today + 1, total: visitors.total + 1 };
      return json(200, visitors);
    }
    let m;
    if ((m = /^\/api\/posts\/([^/]+)\/thumbnail$/.exec(p)) && req.method === "GET") {
      const post = posts.get(decodeURIComponent(m[1]));
      if (!post || !post.thumbnail) return res.writeHead(200).end();
      if (post.thumbnail.type === "generated") {
        res.writeHead(200, { "Content-Type": "image/svg+xml", "Cache-Control": "max-age=60" });
        return res.end(thumbSvg(post));
      }
      res.writeHead(200, { "Content-Type": post.thumbnail.type });
      return res.end(post.thumbnail.bytes);
    }
    if ((m = /^\/api\/posts\/([^/]+)$/.exec(p))) {
      const id = decodeURIComponent(m[1]);
      const post = posts.get(id);
      if (req.method === "GET") {
        if (!post) return json(200, { id: "", tags: null, title: "", subtitle: "", writeTime: "", thumbnail_name: "", text: "", images: null });
        return json(200, { id: post.id, tags: post.tags, title: post.title, subtitle: post.subtitle, writeTime: post.writeTime, thumbnail_name: "", text: post.text, images: null });
      }
      if (req.method === "DELETE") {
        posts.delete(id);
        return res.writeHead(200).end();
      }
      if (req.method === "PUT") {
        const result = await savePost(post, await formOf(req), false);
        log.push(`  -> update ${JSON.stringify(result)}`);
        return res.writeHead(200).end();
      }
    }
    if (req.method === "POST" && p === "/api/post") {
      const result = await savePost(null, await formOf(req), true);
      log.push(`  -> create ${JSON.stringify(result)}`);
      return res.writeHead(200).end();
    }
    if (req.method === "POST" && p === "/api/token") {
      const { token } = JSON.parse((await body(req)).toString() || "{}");
      if (token === "dev-token") return res.writeHead(200).end();
      if (token === "intruder-token") return res.writeHead(403).end();
      return res.writeHead(401).end();
    }
    if (req.method === "GET" && p === "/api/login") {
      res.writeHead(307, { Location: `http://localhost:${WEB_PORT}/github/callback?code=dev-code&state=dev-state` });
      return res.end();
    }
    if (req.method === "GET" && p === "/api/github/callback") {
      if (url.searchParams.get("code") === "intruder") return res.writeHead(403).end();
      if (url.searchParams.get("state") !== "dev-state") return res.writeHead(400).end("Invalid OAuth state");
      return json(200, { token: "dev-token" });
    }
    if (req.method === "GET" && p === "/__log") return json(200, log);
    json(404, { error: "not found" });
  } catch (e) {
    console.error(e);
    json(500, { error: String(e) });
  }
});
api.listen(API_PORT, () => console.log(`mock api on :${API_PORT} (${posts.size} posts)`));

if (staticDir) {
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".svg": "image/svg+xml", ".map": "application/json", ".txt": "text/plain" };
  http
    .createServer((req, res) => {
      const url = new URL(req.url, "http://x");
      let file = path.join(staticDir, decodeURIComponent(url.pathname));
      if (!file.startsWith(staticDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(staticDir, "index.html");
      res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": file.endsWith("index.html") ? "no-cache" : "max-age=31536000" });
      fs.createReadStream(file).pipe(res);
    })
    .listen(WEB_PORT, () => console.log(`static ${staticDir} on :${WEB_PORT}`));
}
