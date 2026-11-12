// 태그를 '주제'로 다룬다. 저장된 태그는 대소문자가 섞여 있어(ISTIO, istio) 소문자 키로 묶고,
// 화면에도 쿠버네티스 레이블처럼 소문자로 보인다.

export function topicKey(raw) {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// 한 글의 태그 배열을 중복 없는 주제 키 목록으로 바꾼다. 쉼표로 한 칸에 여럿 적힌 태그도 나눈다.
export function topicsOf(tags) {
  const seen = new Set();
  const out = [];
  for (const tag of Array.isArray(tags) ? tags : []) {
    for (const part of String(tag ?? "").split(",")) {
      const key = topicKey(part);
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push(key);
      }
    }
  }
  return out;
}

const SEP = "\u0000";

// 주제를 노드로, 같은 글에 함께 붙은 주제 쌍을 선으로 잇는 그래프를 만든다.
// weight 는 두 주제가 함께 붙은 글 수다.
export function buildTopicGraph(posts) {
  const counts = new Map();
  const pairs = new Map();

  for (const post of posts) {
    const keys = [...new Set(post.topics)].sort();
    for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
    for (let i = 0; i < keys.length; i += 1) {
      for (let j = i + 1; j < keys.length; j += 1) {
        const id = keys[i] + SEP + keys[j];
        pairs.set(id, (pairs.get(id) ?? 0) + 1);
      }
    }
  }

  const topics = [...counts]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  const edges = [...pairs]
    .map(([id, weight]) => {
      const [a, b] = id.split(SEP);
      return { a, b, weight };
    })
    .sort((x, y) => y.weight - x.weight || (x.a + x.b).localeCompare(y.a + y.b));

  const weightOf = new Map();
  const neighbors = new Map(topics.map((t) => [t.key, []]));
  for (const { a, b, weight } of edges) {
    neighbors.get(a).push(b);
    neighbors.get(b).push(a);
    weightOf.set(a + SEP + b, weight);
    weightOf.set(b + SEP + a, weight);
  }
  // 함께 쓰인 횟수가 많은 주제부터 읽히도록 정렬한다.
  for (const [key, list] of neighbors) {
    list.sort(
      (x, y) =>
        weightOf.get(key + SEP + y) - weightOf.get(key + SEP + x) ||
        counts.get(y) - counts.get(x) ||
        x.localeCompare(y)
    );
  }

  return { topics, edges, neighbors };
}
