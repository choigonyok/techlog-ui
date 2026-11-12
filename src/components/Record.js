import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatLong, formatMonth } from "../lib/dates";
import { buildRecord, cellLevel, thinTicks } from "../lib/timeline";
import "./Record.css";

const MIN_CELL = 5;
const MAX_CELL = 16;
// 그림 오른쪽에 값(쌓인 글 수)을 적는 자리
const AXIS = 30;
const TICK_WIDTH = 52;

const round = (v) => Math.round(v * 10) / 10;

// 가로선을 그을 값의 간격: 1·2·5 에 10의 거듭제곱을 곱한 수 가운데 서너 줄이 나오는 것
function niceStep(total) {
  const raw = total / 4;
  const power = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  for (const m of [1, 2, 5, 10]) if (m * power >= raw) return m * power;
  return 10 * power;
}

// 계단선. value 가 오를 때만 한 칸 오른다.
function stairs(steps, value, x, y, endX) {
  let d = `M0 ${round(y(0))}`;
  let last = 0;
  for (const step of steps) {
    const v = value(step);
    if (v === last) continue;
    d += `H${round(x(step.at))}V${round(y(v))}`;
    last = v;
  }
  return `${d}H${round(endX)}`;
}

// 칸에 포인터를 올리면 뜨는 설명: 그 칸이 언제이고 글이 몇 편인지
function cellTitle(unit, start, count) {
  const month = formatMonth(start.slice(0, 7));
  const when = {
    week: `${formatLong(start)}부터 한 주`,
    month,
    quarter: `${month}부터 석 달`,
    year: `${start.slice(0, 4)}년`,
  }[unit];
  return `${when}: ${count}편`;
}

// 글이 쌓여 온 기록. 아래 한 줄은 칸(주)마다 쓴 글 수, 위의 계단선은 그때까지 쌓인 글 수다.
// 주제를 고르면 그 주제의 글만 밝히고, 전체는 흐린 선으로 남긴다.
// 그림은 눈으로 보는 요약이고, 같은 내용은 아래 글 목록에 모두 있다.
export default function Record({ posts, topic }) {
  const boxRef = useRef(null);
  const [width, setWidth] = useState(0);
  const captionId = useId();
  // 날짜가 있는 글이 하나도 없으면 그림 자리를 그리지 않는다. 생기면 그때 폭을 잰다.
  const drawable = posts.some((p) => p.date);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const measure = () => setWidth(Math.floor(el.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [drawable]);

  const compact = width > 0 && width < 480;
  const gap = compact ? 2 : 3;
  const maxSlots = Math.max(8, Math.floor((width - AXIS + gap) / (MIN_CELL + gap)));
  const record = useMemo(() => buildRecord(posts, { topic, maxSlots }), [posts, topic, maxSlots]);
  if (!record) return null;

  const { slots, steps, total, unitLabel } = record;
  const picked = topic ? record.picked : total;
  const active = topic ? record.activePicked : record.active;
  // 날짜가 없는 글은 그림에 놓을 수 없다. 그런 글이 있으면 목록의 글 수와 달라 보이지 않게 밝혀 적는다.
  const counted = topic ? `${topic} ` : total < posts.length ? "날짜가 있는 글 " : "글 ";
  const summary = record.hasGap
    ? `모두 ${active}${unitLabel}에 글을 썼습니다`
    : `${record.span}${unitLabel} 가운데 ${active}${unitLabel}에 글을 썼습니다`;
  const period = `${formatMonth(record.first.slice(0, 7))}부터 ${formatMonth(record.last.slice(0, 7))}까지`;

  let chart = null;
  let used = null;
  if (width > 0) {
    const n = slots.length;
    const cell = Math.min(MAX_CELL, Math.max(MIN_CELL, Math.floor((width - AXIS + gap) / n) - gap));
    const pitch = cell + gap;
    const plotW = n * pitch - gap;
    // 칸은 MAX_CELL 보다 커지지 않아 그림이 자리보다 좁을 수 있다. 설명 줄도 그 폭에 맞춘다.
    used = plotW + AXIS;
    const plotH = compact ? 104 : 176;
    const top = 10;
    const x = (at) => at * pitch;
    const y = (count) => top + plotH - (count / total) * plotH;
    const stripY = top + plotH + 12;
    const tickY = stripY + cell + 17;
    const height = tickY + 5;

    const step = niceStep(total);
    const lines = [];
    for (let v = step; v < total; v += step) lines.push(v);

    // 값 이름표: 선 끝의 값은 굵게, 가로선의 값은 흐리게. 서로 겹치면 가로선 쪽을 뺀다.
    const ends = topic ? [picked, total] : [total];
    const clear = (v) => ends.every((e) => Math.abs(y(e) - y(v)) >= 13);

    const gaps = slots
      .map((slot, at) => ({ slot, at }))
      .filter(({ slot }) => slot.kind === "gap")
      .map(({ at }) => {
        const before = steps.filter((s) => s.at < at);
        const last = before[before.length - 1];
        return { at, total: last ? last.total : 0, picked: last ? last.picked : 0 };
      });

    const ticks = thinTicks(record.ticks, pitch, TICK_WIDTH + 12).filter((t) => x(t.at) + TICK_WIDTH <= width);
    const stagger = Math.min(22, 800 / n);

    chart = (
      <svg
        className="record__chart"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={`${period} 글이 쌓여 온 기록. ${topic ? `${topic} 주제의 글` : "날짜가 있는 글"} ${picked}편, ${summary}.`}
      >
        {lines.map((v) => (
          <line key={v} className="record__grid" x1="0" x2={plotW} y1={round(y(v))} y2={round(y(v))} />
        ))}
        <line className="record__grid" x1="0" x2={plotW} y1={round(y(0))} y2={round(y(0))} />
        {lines.filter(clear).map((v) => (
          <text key={v} className="record__value" x={plotW + 8} y={round(y(v)) + 4}>
            {v}
          </text>
        ))}

        {topic && <path className="record__trace record__trace--all" d={stairs(steps, (s) => s.total, x, y, plotW)} />}
        <path
          className="record__trace record__trace--now"
          pathLength="1"
          d={stairs(steps, (s) => (topic ? s.picked : s.total), x, y, plotW)}
        />

        {gaps.map((g) => (
          <g key={g.at}>
            <rect className="record__break" x={x(g.at) - 1} y={top - 6} width={cell + 2} height={plotH + 12} />
            {[...new Set(topic ? [g.total, g.picked] : [g.total])].map((v) => (
              <line
                key={v}
                className="record__pause"
                x1={x(g.at) + 1}
                x2={x(g.at) + cell - 1}
                y1={round(y(v))}
                y2={round(y(v))}
              />
            ))}
          </g>
        ))}

        {topic && Math.abs(y(total) - y(picked)) >= 13 && (
          <text className="record__value" x={plotW + 8} y={round(y(total)) + 4}>
            {total}
          </text>
        )}
        <circle className="record__end" cx={plotW} cy={round(y(picked))} r="4" />
        <text className="record__value record__value--now" x={plotW + 8} y={round(y(picked)) + 4}>
          {picked}
        </text>

        {slots.map((slot, at) =>
          slot.kind === "gap" ? (
            <g key={`gap-${at}`} className="record__dots">
              {[0.2, 0.5, 0.8].map((f) => (
                <circle key={f} cx={round(x(at) + cell * f)} cy={stripY + cell / 2} r="1" />
              ))}
            </g>
          ) : (
            <rect
              key={slot.index}
              className={`record__cell record__cell--${cellLevel(topic ? slot.picked : slot.count, record.peak)}`}
              x={x(at)}
              y={stripY}
              width={cell}
              height={cell}
              rx="2"
              style={{ animationDelay: `${Math.round(150 + at * stagger)}ms` }}
            >
              <title>{cellTitle(record.unit, slot.start, topic ? slot.picked : slot.count)}</title>
            </rect>
          )
        )}

        {ticks.map((tick) => (
          <text key={tick.at} className="record__tick" x={x(tick.at)} y={tickY}>
            {tick.label}
          </text>
        ))}
      </svg>
    );
  }

  return (
    <figure className="record" aria-labelledby={captionId}>
      <figcaption id={captionId} className="record__caption" style={used ? { maxWidth: used } : undefined}>
        <strong className="record__count tnum">
          {counted}
          {picked}편
        </strong>
        <span className="tnum">{summary}</span>
      </figcaption>
      <div className="record__plot" ref={boxRef}>
        {chart}
      </div>
    </figure>
  );
}
