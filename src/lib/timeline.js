// 글이 쌓여 온 기록을 그릴 자료를 만든다. 화면 좌표는 모르고 '몇 번째 칸의 어디쯤'까지만 정한다.
// - 칸(slot)은 한 주다. 칸이 화면에 다 들어가지 않으면 달, 분기, 해로 넓힌다.
// - 글이 없는 칸이 길게 이어지면 한 칸짜리 '쉼'으로 접는다. 몇 해를 쉬었다 다시 써도
//   앞선 기록이 한쪽 구석으로 찌그러지지 않는다.
// - 쌓인 글 수는 계단선으로 그린다. 글 하나가 계단 하나다.

const DAY = 86400000;

// "YYYY-MM-DD" 를 1970-01-01 부터의 날 수로 바꾼다(시간대와 무관하게 UTC 로 센다).
export function dayNumber(iso) {
  return Math.floor(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / DAY);
}

function isoOf(day) {
  return new Date(day * DAY).toISOString().slice(0, 10);
}

function monthStart(index) {
  return Math.floor(Date.UTC(Math.floor(index / 12), index % 12, 1) / DAY);
}

// 단위마다: 날 → 칸 번호, 칸 번호 → 그 칸의 첫날, 이만큼 넘게 비면 쉼으로 접는다, 문장에 쓸 이름
const UNITS = [
  {
    name: "week",
    label: "주",
    maxEmpty: 8,
    // 1970-01-05(날 수 4)가 월요일이다. 주는 월요일에 시작한다.
    index: (day) => Math.floor((day - 4) / 7),
    start: (i) => i * 7 + 4,
  },
  {
    name: "month",
    label: "달",
    maxEmpty: 4,
    index: (day) => {
      const d = new Date(day * DAY);
      return d.getUTCFullYear() * 12 + d.getUTCMonth();
    },
    start: monthStart,
  },
  {
    name: "quarter",
    label: "분기",
    maxEmpty: 3,
    index: (day) => {
      const d = new Date(day * DAY);
      return d.getUTCFullYear() * 4 + Math.floor(d.getUTCMonth() / 3);
    },
    start: (i) => monthStart(i * 3),
  },
  {
    name: "year",
    label: "해",
    maxEmpty: 2,
    index: (day) => new Date(day * DAY).getUTCFullYear(),
    start: (i) => monthStart(i * 12),
  },
];

function tickLabel(unit, startDay) {
  const iso = isoOf(startDay);
  if (unit.name === "year") return iso.slice(0, 4);
  return `${iso.slice(0, 4)}.${iso.slice(5, 7)}`;
}

function build(unit, entries, topic) {
  const byIndex = new Map();
  for (const entry of entries) {
    const i = unit.index(entry.day);
    if (!byIndex.has(i)) byIndex.set(i, []);
    byIndex.get(i).push(entry);
  }
  const first = unit.index(entries[0].day);
  const last = unit.index(entries[entries.length - 1].day);

  const slots = [];
  const slotOf = new Map();
  let empty = [];
  const flushEmpty = () => {
    if (empty.length > unit.maxEmpty) {
      slots.push({ kind: "gap", skipped: empty.length });
    } else {
      for (const i of empty) slots.push({ kind: "bin", index: i, start: isoOf(unit.start(i)), count: 0, picked: 0 });
    }
    empty = [];
  };
  for (let i = first; i <= last; i += 1) {
    const here = byIndex.get(i);
    if (!here) {
      empty.push(i);
      continue;
    }
    flushEmpty();
    slotOf.set(i, slots.length);
    slots.push({
      kind: "bin",
      index: i,
      start: isoOf(unit.start(i)),
      count: here.length,
      picked: topic ? here.filter((e) => e.picked).length : here.length,
    });
  }

  // 계단: 글마다 칸 안에서의 위치(0~1)와 그때까지 쌓인 수
  let total = 0;
  let picked = 0;
  const steps = entries.map((entry) => {
    const i = unit.index(entry.day);
    const from = unit.start(i);
    const span = unit.start(i + 1) - from;
    total += 1;
    if (entry.picked) picked += 1;
    return { at: slotOf.get(i) + (entry.day - from + 0.5) / span, total, picked, isPicked: entry.picked };
  });

  // 눈금: 주 단위에서는 달이 바뀌는 칸마다, 그 밖에는 칸마다. 쉼 뒤의 첫 칸에는 꼭 둔다.
  const ticks = [];
  let previous = "";
  let afterGap = true;
  slots.forEach((slot, at) => {
    if (slot.kind === "gap") {
      afterGap = true;
      return;
    }
    const label = tickLabel(unit, unit.start(slot.index));
    if (afterGap || label !== previous) ticks.push({ at, label, anchor: afterGap });
    previous = label;
    afterGap = false;
  });

  const bins = slots.filter((s) => s.kind === "bin");
  return {
    unit: unit.name,
    unitLabel: unit.label,
    slots,
    steps,
    ticks,
    total,
    picked,
    peak: Math.max(...bins.map((s) => s.count)),
    span: last - first + 1,
    active: bins.filter((s) => s.count > 0).length,
    activePicked: bins.filter((s) => s.picked > 0).length,
    hasGap: slots.some((s) => s.kind === "gap"),
    first: entries[0].date,
    last: entries[entries.length - 1].date,
  };
}

/**
 * @param posts    [{ date: "YYYY-MM-DD" | "", topics: [string] }]  날짜가 없는 글은 뺀다.
 * @param topic    고른 주제. 있으면 그 주제의 글만 picked 로 센다.
 * @param maxSlots 화면에 놓을 수 있는 칸 수. 넘으면 더 큰 단위로 묶는다.
 * @returns 기록 자료. 날짜가 있는 글이 없으면 null.
 */
export function buildRecord(posts, { topic = null, maxSlots = 60 } = {}) {
  const entries = posts
    .filter((p) => p.date)
    .map((p) => ({ date: p.date, day: dayNumber(p.date), picked: topic ? p.topics.includes(topic) : true }))
    .sort((a, b) => a.day - b.day);
  if (!entries.length) return null;

  let record = null;
  for (const unit of UNITS) {
    record = build(unit, entries, topic);
    if (record.slots.length <= maxSlots) break;
  }
  return record;
}

// 칸의 밝기 단계. 글이 없으면 0, 가장 많이 쓴 칸을 3으로 본다.
export function cellLevel(count, peak) {
  if (count <= 0) return 0;
  return Math.min(3, Math.max(1, Math.ceil((count / Math.max(1, peak)) * 3)));
}

// 눈금 글자가 서로 겹치지 않게 솎는다. 맨 앞과 쉼 뒤의 첫 눈금(anchor)은 남기고,
// 그 사이는 '몇 개마다 하나'로 고르게 건너뛴다. 겹치지 않는 가장 촘촘한 간격을 고른다.
export function thinTicks(ticks, slotWidth, minGap) {
  const apart = (a, b) => Math.abs(a.at - b.at) * slotWidth >= minGap;
  const anchors = [];
  for (const tick of ticks) if (tick.anchor && anchors.every((k) => apart(k, tick))) anchors.push(tick);

  for (let stride = 1; stride <= ticks.length; stride += 1) {
    const kept = [];
    let since = 0;
    let ok = true;
    for (const tick of ticks) {
      if (tick.anchor) {
        since = 0;
        if (anchors.includes(tick)) kept.push(tick);
        continue;
      }
      since += 1;
      if (since % stride !== 0) continue;
      // 다음 쉼 뒤 눈금과 겹치는 것은 간격을 넓히지 않고 그 하나만 뺀다.
      if (anchors.some((k) => k.at > tick.at && !apart(k, tick))) continue;
      if (kept.length && !apart(kept[kept.length - 1], tick)) {
        ok = false;
        break;
      }
      kept.push(tick);
    }
    if (ok) return kept;
  }
  return anchors;
}
