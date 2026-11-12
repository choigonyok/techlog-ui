import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { estimateLabelWidth, layoutMesh, meshHeight } from "../lib/meshLayout";
import "./TopicMesh.css";

const MAX_NODES = 24;

function topicHref(key) {
  return `/?tag=${encodeURIComponent(key)}`;
}

// 주제를 노드로, 같은 글에 함께 붙은 주제를 선으로 잇는다.
// - 노드를 누르면 그 주제로 거른다(주소 /?tag= 에 남는다). 선택된 노드를 다시 누르면 전체로 돌아간다.
// - highlight 로 받은 주제(목록에서 포인터를 올린 글의 주제)는 밝히고 나머지는 흐린다.
export default function TopicMesh({ graph, selected, highlight }) {
  const boxRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState(null);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const measure = () => setWidth(Math.floor(el.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const compact = width > 0 && width < 520;
  // 이름표는 rem 기준이라 브라우저 글자 크기 설정을 따른다.
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const fontSize = Math.round((compact ? 0.8125 : 0.875) * rem);
  const labelHeight = Math.round(fontSize * 1.3);
  // 손가락으로 누를 화면이면 노드 상자를 44px 이상으로 둔다.
  const fine = window.matchMedia("(pointer: fine)").matches;
  const minTarget = fine ? 36 : 44;
  const gap = fine ? 4 : 8;

  const topics = useMemo(() => graph.topics.slice(0, MAX_NODES), [graph]);
  const edges = useMemo(() => {
    const keys = new Set(topics.map((t) => t.key));
    return graph.edges.filter((e) => keys.has(e.a) && keys.has(e.b));
  }, [graph, topics]);
  const maxWeight = useMemo(() => Math.max(1, ...edges.map((e) => e.weight)), [edges]);

  const nodes = useMemo(
    () => topics.map((t) => ({ key: t.key, count: t.count, labelWidth: estimateLabelWidth(t.key, fontSize) })),
    [topics, fontSize]
  );
  const height = useMemo(
    () =>
      meshHeight(nodes, width, {
        labelHeight,
        minTarget,
        gap,
        density: compact ? 2.1 : 2.5,
        min: compact ? 340 : 380,
        max: compact ? 480 : 560,
      }),
    [nodes, width, minTarget, compact, labelHeight, gap]
  );
  const layout = useMemo(
    () => (width > 0 ? layoutMesh(nodes, edges, { width, height, labelHeight, minTarget, gap }) : null),
    [nodes, edges, width, height, minTarget, labelHeight, gap]
  );

  const focus = useMemo(() => {
    if (highlight && highlight.length) return { set: new Set(highlight), topic: null };
    const key = hovered || selected;
    if (key && graph.neighbors.has(key)) return { set: new Set([key, ...graph.neighbors.get(key)]), topic: key };
    return null;
  }, [highlight, hovered, selected, graph]);

  const edgeState = (e) => {
    if (!focus) return undefined;
    if (focus.topic) return e.a === focus.topic || e.b === focus.topic ? "is-lit" : "is-dim";
    return focus.set.has(e.a) && focus.set.has(e.b) ? "is-lit" : "is-dim";
  };
  const nodeState = (key) => {
    if (!focus) return "";
    return focus.set.has(key) ? " is-lit" : " is-dim";
  };

  return (
    <section className="mesh-panel" aria-labelledby="mesh-title">
      <div className="mesh-panel__head">
        <h2 id="mesh-title" className="mesh-panel__title">
          주제
        </h2>
        <p className="mesh-panel__hint">
          같은 글에 함께 붙은 주제끼리 선으로 이었습니다. 주제를 누르면 그 주제의 글만 봅니다.
        </p>
      </div>
      <div className="mesh" ref={boxRef} style={{ height }}>
        {layout && (
          <>
            <svg className="mesh__edges" width={width} height={height} aria-hidden="true" focusable="false">
              {edges.map((e) => {
                const a = layout.get(e.a);
                const b = layout.get(e.b);
                // 함께 쓰인 글이 많을수록 굵고 진하게 긋는다.
                const strength = maxWeight > 1 ? (e.weight - 1) / (maxWeight - 1) : 0;
                return (
                  <line
                    key={`${e.a}|${e.b}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    strokeWidth={(1 + 1.6 * strength).toFixed(2)}
                    strokeOpacity={(0.6 + 0.4 * strength).toFixed(2)}
                    className={edgeState(e)}
                  />
                );
              })}
            </svg>
            <ul className="mesh__nodes">
              {topics.map((t) => {
                const p = layout.get(t.key);
                const isSelected = selected === t.key;
                const together = graph.neighbors.get(t.key) || [];
                return (
                  <li
                    key={t.key}
                    className="mesh__item"
                    style={{ left: p.left, top: p.top, width: p.width, height: p.height }}
                  >
                    <Link
                      to={isSelected ? "/" : topicHref(t.key)}
                      replace
                      className={`mesh__node${nodeState(t.key)}`}
                      aria-current={isSelected ? "true" : undefined}
                      style={{ "--dot": `${p.r * 2}px`, fontSize, lineHeight: `${labelHeight}px` }}
                      onMouseEnter={() => setHovered(t.key)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(t.key)}
                      onBlur={() => setHovered(null)}
                    >
                      <span className="mesh__dot" aria-hidden="true" />
                      <span className="mesh__label">{t.key}</span>
                      <span className="sr-only">
                        {`, 글 ${t.count}편. `}
                        {together.length ? `함께 쓰인 주제: ${together.join(", ")}.` : "함께 쓰인 주제는 없습니다."}
                        {isSelected ? " 지금 고른 주제입니다. 누르면 전체 글을 봅니다." : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
