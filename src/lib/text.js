// DB 의 VARCHAR(40) 은 바이트가 아니라 글자(코드 포인트) 수를 센다. JS 의 length 는
// 이모지를 2로 세므로 코드 포인트 단위로 센다.
export function charLength(value) {
  return Array.from(String(value ?? "")).length;
}

// 제목 텍스트로 문서 안에서 겹치지 않는 id 를 만든다. 한글은 그대로 둔다.
export function createSlugger() {
  const seen = new Map();
  return function slug(text) {
    const base =
      String(text ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s_-]/gu, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "section";
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };
}

// 쉼표로 적은 주제 입력을 나눈다. 빈 칸과 대소문자만 다른 중복은 뺀다.
export function parseTopicInput(value) {
  const seen = new Set();
  const out = [];
  for (const part of String(value ?? "").split(",")) {
    const name = part.trim().replace(/\s+/g, " ");
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      out.push(name);
    }
  }
  return out;
}

// 본문에서 서버가 내려받을 수 없는 이미지 주소를 찾는다. 서버는 바깥 그림(http/https)을 내려받아
// 저장소에 옮겨 두므로, 그 밖의 주소(data:, 상대 경로)가 있으면 저장이 막힌다.
// 이미 이 서버에 있는 그림(/api/images/...)은 괜찮다.
export function findUnfetchableImages(markdown) {
  const bad = [];
  const re = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
  let m;
  while ((m = re.exec(String(markdown ?? "")))) {
    if (!/^https?:\/\//i.test(m[1]) && !m[1].startsWith("/api/images/")) bad.push(m[1]);
  }
  return bad;
}
