import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./Toc.css";

function prefersReducedMotion() {
  return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

// 그려진 본문에서 h2·h3 를 읽어 목차를 만든다. id 는 렌더러가 붙인다.
export function useHeadings(rootRef, key) {
  const [headings, setHeadings] = useState([]);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const found = [...root.querySelectorAll(".prose h2[id], .prose h3[id]")].map((el) => ({
      id: el.id,
      text: el.textContent.trim(),
      level: Number(el.tagName[1]),
    }));
    setHeadings(found);
  }, [rootRef, key]);
  return headings;
}

const JUMP = "toc:jump";

// 화면 위쪽 기준선을 지난 마지막 제목을 '지금 읽는 절'로 본다.
// 목차를 눌러 이동하는 동안에는 지나가는 절이 깜빡이지 않도록, 스크롤이 멈출 때까지 누른 절을 표시한다.
export function useActiveHeading(headings, offset = 96) {
  const [active, setActive] = useState(null);
  useEffect(() => {
    if (!headings.length) {
      setActive(null);
      return undefined;
    }
    let frame = 0;
    let pinned = false;
    let settle = 0;
    const compute = () => {
      frame = 0;
      let current = null;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - offset <= 0) current = h.id;
        else break;
      }
      // 마지막 절이 짧아 기준선에 닿지 못해도, 맨 아래까지 내렸으면 마지막 절을 표시한다.
      const last = document.getElementById(headings[headings.length - 1].id);
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom && last && last.getBoundingClientRect().top < window.innerHeight) current = last.id;
      setActive(current);
    };
    const release = () => {
      pinned = false;
      compute();
    };
    const onJump = (event) => {
      pinned = true;
      setActive(event.detail);
      window.clearTimeout(settle);
      settle = window.setTimeout(release, 700);
    };
    const onScroll = () => {
      if (pinned) {
        window.clearTimeout(settle);
        settle = window.setTimeout(release, 160);
        return;
      }
      if (!frame) frame = window.requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener(JUMP, onJump);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener(JUMP, onJump);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.clearTimeout(settle);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [headings, offset]);
  return active;
}

function jumpTo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  window.dispatchEvent(new CustomEvent(JUMP, { detail: id }));
  // 가까운 절은 부드럽게, 화면 세 개보다 먼 절은 기다리지 않게 바로 옮긴다.
  const far = Math.abs(el.getBoundingClientRect().top) > window.innerHeight * 3;
  el.scrollIntoView({ behavior: far || prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  // 라우터가 history.state 에 둔 키(스크롤 복원에 쓰인다)를 지키며 주소의 # 만 바꾼다.
  window.history.replaceState(window.history.state, "", `#${encodeURIComponent(id)}`);
  // 키보드·화면 낭독기 사용자가 고른 절부터 이어 읽도록 포커스를 옮긴다.
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}

function TocList({ headings, activeId, onPick }) {
  return (
    <ul className="toc__list">
      {headings.map((h) => (
        <li key={h.id} className={`toc__item toc__item--${h.level}`}>
          <a
            href={`#${encodeURIComponent(h.id)}`}
            aria-current={h.id === activeId ? "location" : undefined}
            onClick={(event) => {
              event.preventDefault();
              if (onPick) onPick();
              jumpTo(h.id);
            }}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

// 넓은 화면: 본문 옆에서 따라 내려오는 목차
export function TocAside({ headings, activeId }) {
  if (headings.length < 2) return null;
  return (
    <nav className="toc" aria-labelledby="toc-title">
      <h2 id="toc-title" className="toc__title">
        목차
      </h2>
      <TocList headings={headings} activeId={activeId} />
    </nav>
  );
}

// 좁은 화면: 위에 붙어 지금 읽는 절을 보여 주고, 누르면 펼쳐지는 목차
export function TocBar({ headings, activeId }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  const shown = headings.length >= 2;
  useEffect(() => {
    if (!shown) return undefined;
    document.documentElement.classList.add("has-toc-bar");
    return () => document.documentElement.classList.remove("has-toc-bar");
  }, [shown]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        if (buttonRef.current) buttonRef.current.focus();
      }
    };
    const onPointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  if (!shown) return null;
  const current = headings.find((h) => h.id === activeId);

  return (
    <nav className="toc-bar" ref={rootRef} aria-label="목차">
      <button
        ref={buttonRef}
        type="button"
        className="toc-bar__toggle"
        aria-expanded={open}
        aria-controls="toc-sheet"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="toc-bar__label">목차</span>
        <span className="toc-bar__current">{current ? current.text : ""}</span>
        <svg className="toc-bar__chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <div id="toc-sheet" className="toc-bar__sheet" hidden={!open}>
        <TocList headings={headings} activeId={activeId} onPick={() => setOpen(false)} />
      </div>
    </nav>
  );
}
