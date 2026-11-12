import { createSlugger } from "./text";

// hast(HTML 구문 트리)를 다루는 작은 도우미들. 렌더러 묶음과 테스트에서 함께 쓴다.

export function walk(node, visit, parent = null, index = -1) {
  visit(node, parent, index);
  const children = node.children;
  if (!children) return;
  for (let i = 0; i < children.length; i += 1) walk(children[i], visit, node, i);
}

export function textOf(node) {
  if (!node) return "";
  if (node.type === "text") return node.value;
  if (node.children) return node.children.map(textOf).join("");
  return "";
}

// 본문 제목 단계를 페이지 구조에 맞춘다. 글에서 가장 큰 제목을 base 단계로 두고(글 화면은
// h1 이 글 제목이므로 h2) 나머지를 같은 만큼 옮겨 단계가 건너뛰지 않게 한다.
// 각 제목에는 목차가 가리킬 id 를 붙인다.
export function rehypeHeadings(options = {}) {
  const base = options.base ?? 2;
  return function transform(tree) {
    const heads = [];
    walk(tree, (node) => {
      if (node.type === "element" && /^h[1-6]$/.test(node.tagName)) heads.push(node);
    });
    if (!heads.length) return;
    const top = Math.min(...heads.map((h) => Number(h.tagName[1])));
    const slug = createSlugger();
    for (const h of heads) {
      const level = Math.min(6, Number(h.tagName[1]) - top + base);
      h.tagName = `h${level}`;
      h.properties = { ...(h.properties || {}), id: slug(textOf(h)) };
    }
  };
}

export function youtubeId(src) {
  try {
    const url = new URL(src);
    const host = url.hostname.replace(/^(www|m)\./, "");
    let id = null;
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else id = (/^\/(?:embed|shorts|live)\/([^/?#]+)/.exec(url.pathname) || [])[1];
    }
    return id && /^[\w-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

const IFRAME = /^\s*<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*(?:<\/iframe>)?\s*$/i;
const TITLE = /\btitle\s*=\s*["']([^"']*)["']/i;

// 본문의 HTML 원문은 글자 그대로 보인다(문장 속 `<Protocol>` 같은 낱말이 사라지지 않게).
// 유튜브 영상을 넣으려 붙인 <iframe> 한 줄만 영상 틀로 바꾼다.
export function rehypeYoutube() {
  return function transform(tree) {
    walk(tree, (node, parent, index) => {
      if (node.type !== "raw" || !parent) return;
      const m = IFRAME.exec(node.value);
      if (!m) return;
      const id = youtubeId(m[1]);
      if (!id) return;
      const title = (TITLE.exec(node.value) || [])[1] || "YouTube 영상";
      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: { className: ["video"] },
        children: [
          {
            type: "element",
            tagName: "iframe",
            properties: {
              src: `https://www.youtube-nocookie.com/embed/${id}`,
              title,
              loading: "lazy",
              allow: "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
              allowFullScreen: true,
              referrerPolicy: "strict-origin-when-cross-origin",
            },
            children: [],
          },
        ],
      };
    });
  };
}

// 그림만 들어 있는 문단인지 본다(그림 사이의 빈칸·줄바꿈은 괜찮다).
export function isImageOnly(node) {
  const children = (node && node.children) || [];
  const solid = children.filter(
    (c) => !(c.type === "text" && !c.value.trim()) && !(c.type === "element" && c.tagName === "br")
  );
  return solid.length > 0 && solid.every((c) => c.type === "element" && c.tagName === "img");
}

export function codeLanguage(node) {
  const names = node?.properties?.className;
  if (!Array.isArray(names)) return null;
  for (const name of names) {
    const value = String(name);
    if (value.startsWith("language-")) return value.slice(9).toLowerCase() || null;
  }
  return null;
}
