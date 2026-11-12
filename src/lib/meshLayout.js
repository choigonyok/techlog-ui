// 주제 메시의 노드 위치를 계산한다.
// - 같은 입력이면 늘 같은 배치가 나오도록 난수를 쓰지 않는다(해바라기 씨 배열로 시작).
// - 노드마다 점과 그 아래 이름표를 품은 상자가 있고, 상자는 손가락으로 누를 수 있는
//   크기(minTarget) 이상이며 서로 겹치지 않는다. 상자가 곧 누르는 영역이다.
// - 힘 기반 배치(Fruchterman-Reingold)에 상자 충돌 해소를 더했다.

const DOT_TOP = 6; // 상자 위쪽에서 점까지
const LABEL_GAP = 4; // 점과 이름표 사이
const BOTTOM_PAD = 4;

// IBM Plex Sans KR 기준 글자 폭 어림값(em). 실제 글꼴을 읽기 전에도 겹치지 않을 만큼 넉넉하게 잡는다.
const NARROW = "iljtfr./-:'|!, ";

export function estimateLabelWidth(text, fontSize) {
  let em = 0;
  for (const ch of String(text)) {
    if (ch >= "가" && ch <= "힣") em += 0.94;
    else if (NARROW.includes(ch)) em += 0.3;
    else if (ch === "m" || ch === "w") em += 0.84;
    else if (ch >= "A" && ch <= "Z") em += 0.64;
    else em += 0.56;
  }
  return Math.ceil(em * fontSize);
}

export function nodeRadius(count, maxCount) {
  return Math.round(4 + 7 * Math.sqrt(count / Math.max(1, maxCount)));
}

export function nodeBox(node, { labelHeight, minTarget, maxCount }) {
  const r = nodeRadius(node.count, maxCount);
  const width = Math.max(minTarget, node.labelWidth + 12);
  const height = Math.max(minTarget, DOT_TOP + 2 * r + LABEL_GAP + labelHeight + BOTTOM_PAD);
  return { r, width, height };
}

function clampInto(it, W, H, pad) {
  const minX = pad + it.w / 2;
  const maxX = W - pad - it.w / 2;
  const minY = pad + it.h / 2;
  const maxY = H - pad - it.h / 2;
  it.x = minX > maxX ? W / 2 : Math.min(maxX, Math.max(minX, it.x));
  it.y = minY > maxY ? H / 2 : Math.min(maxY, Math.max(minY, it.y));
}

// 겹친 상자를 덜 겹친 축으로 반씩 밀어낸다. 겹침이 남았는지 돌려준다.
function separate(items, gap, W, H, pad) {
  let moved = false;
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i];
      const b = items[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const ox = (a.w + b.w) / 2 + gap - Math.abs(dx);
      const oy = (a.h + b.h) / 2 + gap - Math.abs(dy);
      if (ox <= 0 || oy <= 0) continue;
      moved = true;
      if (ox < oy) {
        const s = dx === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dx);
        a.x += (s * ox) / 2;
        b.x -= (s * ox) / 2;
      } else {
        const s = dy === 0 ? (j % 2 === 0 ? 1 : -1) : Math.sign(dy);
        a.y += (s * oy) / 2;
        b.y -= (s * oy) / 2;
      }
      clampInto(a, W, H, pad);
      clampInto(b, W, H, pad);
    }
  }
  return moved;
}

// 중심에서 먼 순서는 지키면서 반지름을 고르게 나눠, 허브가 몰린 가운데를 넓힌다.
function equalize(items, W, H) {
  const n = items.length;
  if (n < 3) return;
  const cx = items.reduce((s, it) => s + it.x, 0) / n;
  const cy = items.reduce((s, it) => s + it.y, 0) / n;
  const polar = items
    .map((it, i) => {
      const dx = (it.x - cx) / (W / 2);
      const dy = (it.y - cy) / (H / 2);
      return { it, i, r: Math.hypot(dx, dy), a: Math.atan2(dy, dx) };
    })
    .sort((p, q) => p.r - q.r || p.i - q.i);
  const maxR = polar[n - 1].r || 1;
  polar.forEach((p, rank) => {
    const r = 0.35 * (p.r / maxR) + 0.65 * Math.sqrt((rank + 0.5) / n);
    p.it.x = cx + Math.cos(p.a) * r * (W / 2);
    p.it.y = cy + Math.sin(p.a) * r * (H / 2);
  });
}

function spread(items, W, H, pad) {
  if (items.length < 2) return;
  equalize(items, W, H);
  const xs = items.map((it) => it.x);
  const ys = items.map((it) => it.y);
  const minX = Math.min(...xs);
  const spanX = Math.max(...xs) - minX;
  const minY = Math.min(...ys);
  const spanY = Math.max(...ys) - minY;
  for (const it of items) {
    if (spanX > 0) it.x = pad + it.w / 2 + ((it.x - minX) / spanX) * (W - 2 * pad - it.w);
    if (spanY > 0) it.y = pad + it.h / 2 + ((it.y - minY) / spanY) * (H - 2 * pad - it.h);
  }
}

/**
 * @param nodes  [{ key, count, labelWidth }]  많이 쓰인 주제부터 정렬돼 있으면 가운데에 모인다.
 * @param edges  [{ a, b, weight }]
 * @returns Map(key -> { x, y, r, left, top, width, height })  x·y 는 점의 중심
 */
export function layoutMesh(nodes, edges, options) {
  const {
    width: W,
    height: H,
    labelHeight = 18,
    minTarget = 44,
    gap = 4,
    padding = 2,
    iterations = 320,
  } = options;
  const result = new Map();
  const n = nodes.length;
  if (!n || W <= 0 || H <= 0) return result;

  const maxCount = Math.max(...nodes.map((d) => d.count));
  const items = nodes.map((node) => {
    const { r, width, height } = nodeBox(node, { labelHeight, minTarget, maxCount });
    return { key: node.key, r, w: width, h: height, x: 0, y: 0, dx: 0, dy: 0 };
  });

  const cx = W / 2;
  const cy = H / 2;
  const golden = Math.PI * (3 - Math.sqrt(5));
  items.forEach((it, i) => {
    const t = Math.sqrt((i + 0.5) / n);
    const angle = i * golden;
    it.x = cx + Math.cos(angle) * t * (W / 2 - it.w / 2) * 0.85;
    it.y = cy + Math.sin(angle) * t * (H / 2 - it.h / 2) * 0.85;
  });

  const index = new Map(items.map((it, i) => [it.key, i]));
  const links = edges
    .map((e) => ({ s: index.get(e.a), t: index.get(e.b), w: e.weight }))
    .filter((l) => l.s !== undefined && l.t !== undefined);
  const maxWeight = Math.max(1, ...links.map((l) => l.w));

  const k = Math.sqrt((W * H) / n) * 0.62;
  let temp = Math.min(W, H) / 5;
  const cooling = temp / iterations;

  for (let step = 0; step < iterations; step += 1) {
    for (const it of items) {
      it.dx = 0;
      it.dy = 0;
    }
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const a = items[i];
        const b = items[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d = Math.hypot(dx, dy);
        if (d < 0.01) {
          dx = 0.01 * (i - j);
          dy = 0.01;
          d = Math.hypot(dx, dy);
        }
        const f = (k * k) / d;
        a.dx += (dx / d) * f;
        a.dy += (dy / d) * f;
        b.dx -= (dx / d) * f;
        b.dy -= (dy / d) * f;
      }
    }
    for (const l of links) {
      const a = items[l.s];
      const b = items[l.t];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.max(0.01, Math.hypot(dx, dy));
      const f = ((d * d) / k) * (0.35 + 0.65 * (l.w / maxWeight));
      a.dx -= (dx / d) * f;
      a.dy -= (dy / d) * f;
      b.dx += (dx / d) * f;
      b.dy += (dy / d) * f;
    }
    // 가운데로 당기는 힘. 패널 비율에 맞춰 가로·세로를 따로 재서 넓은 패널에선 옆으로 퍼진다.
    for (const it of items) {
      it.dx += 1.4 * k * ((cx - it.x) / (W / 2));
      it.dy += 1.4 * k * ((cy - it.y) / (H / 2));
    }
    for (const it of items) {
      const d = Math.hypot(it.dx, it.dy);
      if (d > 0) {
        const move = Math.min(d, temp);
        it.x += (it.dx / d) * move;
        it.y += (it.dy / d) * move;
      }
      clampInto(it, W, H, padding);
    }
    separate(items, gap, W, H, padding);
    temp = Math.max(0.5, temp - cooling);
  }

  // 힘 배치는 가운데로 뭉치기 쉽다. 노드끼리의 상대 위치는 지키면서 패널 전체로 펴서
  // 넓은 패널(태블릿 가로 등)에서도 빈 가장자리가 남지 않게 한다.
  spread(items, W, H, padding);

  for (let pass = 0; pass < 200 && separate(items, gap, W, H, padding); pass += 1) {
    // 겹침이 사라질 때까지 민다.
  }

  for (const it of items) {
    const left = Math.round(it.x - it.w / 2);
    const top = Math.round(it.y - it.h / 2);
    result.set(it.key, {
      x: left + it.w / 2,
      y: top + DOT_TOP + it.r,
      r: it.r,
      left,
      top,
      width: it.w,
      height: it.h,
    });
  }
  return result;
}

// 노드 상자 넓이 합으로 패널 높이를 정한다. 좁은 화면일수록 세로로 길어진다.
export function meshHeight(nodes, width, { labelHeight, minTarget, gap = 4, density = 2.5, min = 300, max = 560 }) {
  if (!nodes.length || width <= 0) return min;
  const maxCount = Math.max(...nodes.map((d) => d.count));
  let area = 0;
  for (const node of nodes) {
    const box = nodeBox(node, { labelHeight, minTarget, maxCount });
    area += (box.width + gap) * (box.height + gap);
  }
  return Math.round(Math.min(max, Math.max(min, (area * density) / width)));
}
