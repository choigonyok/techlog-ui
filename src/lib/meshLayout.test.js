import { estimateLabelWidth, layoutMesh, meshHeight } from "./meshLayout";

const names = ["kubernetes", "projects", "infra", "istio", "cloud", "dev", "golang", "docker", "ops", "sec", "aws", "ci/cd", "network", "retrospect", "terraform"];
const counts = [21, 21, 13, 12, 10, 9, 8, 5, 4, 3, 2, 2, 1, 1, 1];
const nodes = names.map((key, i) => ({ key, count: counts[i], labelWidth: estimateLabelWidth(key, 13) }));
const edges = [];
for (let i = 0; i < names.length; i += 1) {
  for (let j = i + 1; j < names.length; j += 3) edges.push({ a: names[i], b: names[j], weight: 1 + ((i + j) % 4) });
}

function boxes(layout) {
  return [...layout.values()].map((p) => ({ l: p.left, t: p.top, r: p.left + p.width, b: p.top + p.height, ...p }));
}

describe.each([
  [358, 44, 8],
  [420, 36, 4],
  [756, 44, 8],
])("너비 %ipx, 최소 누름 영역 %ipx", (width, minTarget, gap) => {
  const opts = { labelHeight: 17, minTarget, gap };
  const height = meshHeight(nodes, width, { ...opts, min: 320, max: 560 });
  const layout = layoutMesh(nodes, edges, { ...opts, width, height });
  const list = boxes(layout);

  test("모든 노드가 패널 안에 있다", () => {
    expect(list).toHaveLength(names.length);
    for (const b of list) {
      expect(b.l).toBeGreaterThanOrEqual(0);
      expect(b.t).toBeGreaterThanOrEqual(0);
      expect(b.r).toBeLessThanOrEqual(width);
      expect(b.b).toBeLessThanOrEqual(height);
    }
  });

  test("누름 영역은 최소 크기 이상이고 서로 겹치지 않는다", () => {
    for (const b of list) {
      expect(b.width).toBeGreaterThanOrEqual(minTarget);
      expect(b.height).toBeGreaterThanOrEqual(minTarget);
    }
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const c = list[j];
        const apart = a.r + gap - 1 <= c.l || c.r + gap - 1 <= a.l || a.b + gap - 1 <= c.t || c.b + gap - 1 <= a.t;
        expect(apart).toBe(true);
      }
    }
  });

  test("같은 입력이면 늘 같은 배치", () => {
    const again = layoutMesh(nodes, edges, { ...opts, width, height });
    expect([...again.entries()]).toEqual([...layout.entries()]);
  });
});
