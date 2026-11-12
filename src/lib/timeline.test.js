import { buildRecord, cellLevel, dayNumber, thinTicks } from "./timeline";

const post = (date, ...topics) => ({ date, topics });

test("날짜가 있는 글이 없으면 그릴 기록이 없다", () => {
  expect(buildRecord([])).toBeNull();
  expect(buildRecord([post("", "istio")])).toBeNull();
});

test("주마다 칸을 만들고, 글이 없는 주도 칸으로 남긴다", () => {
  // 2024-01-01 은 월요일이다.
  const record = buildRecord([post("2024-01-01"), post("2024-01-03"), post("2024-01-17"), post("")]);
  expect(record.unit).toBe("week");
  expect(record.slots.map((s) => s.count)).toEqual([2, 0, 1]);
  expect(record.slots[0].start).toBe("2024-01-01");
  expect(record.total).toBe(3);
  expect(record.span).toBe(3);
  expect(record.active).toBe(2);
  expect(record.hasGap).toBe(false);
});

test("계단은 글마다 하나씩, 칸 안에서 날짜 순서대로 오른다", () => {
  const record = buildRecord([post("2024-01-17"), post("2024-01-01"), post("2024-01-03")]);
  expect(record.steps.map((s) => s.total)).toEqual([1, 2, 3]);
  const at = record.steps.map((s) => s.at);
  expect(at[0]).toBeGreaterThanOrEqual(0);
  expect(at[0]).toBeLessThan(at[1]);
  expect(at[1]).toBeLessThan(1);
  expect(Math.floor(at[2])).toBe(2);
});

test("고른 주제의 글만 따로 센다", () => {
  const record = buildRecord(
    [post("2024-01-01", "istio"), post("2024-01-03", "go"), post("2024-01-17", "istio", "go")],
    {
      topic: "istio",
    }
  );
  expect(record.picked).toBe(2);
  expect(record.slots.map((s) => s.picked)).toEqual([1, 0, 1]);
  expect(record.steps.map((s) => s.picked)).toEqual([1, 1, 2]);
  expect(record.activePicked).toBe(2);
  expect(record.total).toBe(3);
});

test("오래 쉰 기간은 한 칸짜리 쉼으로 접는다", () => {
  const record = buildRecord([post("2024-01-01"), post("2024-01-08"), post("2026-11-09")]);
  expect(record.unit).toBe("week");
  expect(record.slots.map((s) => s.kind)).toEqual(["bin", "bin", "gap", "bin"]);
  expect(record.hasGap).toBe(true);
  // 쉼 뒤의 글은 쉼 다음 칸에 놓인다.
  expect(Math.floor(record.steps[2].at)).toBe(3);
  // 쉼 뒤의 첫 칸에는 눈금을 둔다.
  expect(record.ticks.map((t) => t.label)).toEqual(["2024.01", "2026.11"]);
  expect(record.ticks.every((t) => t.anchor)).toBe(true);
});

test("칸이 화면에 다 들어가지 않으면 더 큰 단위로 묶는다", () => {
  const posts = [];
  for (let m = 0; m < 24; m += 1) {
    const iso = `${2023 + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`;
    posts.push(post(`${iso}-05`), post(`${iso}-19`));
  }
  expect(buildRecord(posts, { maxSlots: 200 }).unit).toBe("week");
  const monthly = buildRecord(posts, { maxSlots: 40 });
  expect(monthly.unit).toBe("month");
  expect(monthly.slots).toHaveLength(24);
  expect(monthly.slots.every((s) => s.count === 2)).toBe(true);
  expect(buildRecord(posts, { maxSlots: 10 }).unit).toBe("quarter");
  expect(buildRecord(posts, { maxSlots: 4 }).unit).toBe("year");
});

test("날 수는 시간대와 무관하다", () => {
  expect(dayNumber("1970-01-01")).toBe(0);
  expect(dayNumber("2024-01-01") - dayNumber("2023-12-31")).toBe(1);
});

test("칸의 밝기는 가장 많이 쓴 칸을 기준으로 세 단계다", () => {
  expect(cellLevel(0, 3)).toBe(0);
  expect(cellLevel(1, 3)).toBe(1);
  expect(cellLevel(2, 3)).toBe(2);
  expect(cellLevel(3, 3)).toBe(3);
  expect(cellLevel(1, 1)).toBe(3);
  expect(cellLevel(4, 12)).toBe(1);
});

test("눈금은 겹치지 않게 솎고, 쉼 뒤의 눈금을 먼저 남긴다", () => {
  const ticks = [
    { at: 0, label: "2023.06", anchor: true },
    { at: 2, label: "2023.07", anchor: false },
    { at: 6, label: "2023.08", anchor: false },
    { at: 8, label: "2026.11", anchor: true },
  ];
  expect(thinTicks(ticks, 10, 50).map((t) => t.label)).toEqual(["2023.06", "2026.11"]);
  expect(thinTicks(ticks, 10, 20).map((t) => t.label)).toEqual(["2023.06", "2023.07", "2023.08", "2026.11"]);
});

test("눈금은 고르게 건너뛴다", () => {
  // 맨 앞 달은 두 칸 만에 끝나고, 그 뒤로는 달마다 네 칸쯤이다.
  const at = [0, 2, 6, 11, 15, 19, 24, 28, 33];
  const ticks = at.map((a, i) => ({ at: a, label: `m${i}`, anchor: i === 0 }));
  expect(thinTicks(ticks, 10, 20).map((t) => t.label)).toEqual(ticks.map((t) => t.label));
  expect(thinTicks(ticks, 10, 30).map((t) => t.label)).toEqual(["m0", "m2", "m4", "m6", "m8"]);
  expect(thinTicks(ticks, 10, 64).map((t) => t.label)).toEqual(["m0", "m3", "m6"]);
  expect(thinTicks(ticks, 10, 120).map((t) => t.label)).toEqual(["m0", "m4", "m8"]);
});
