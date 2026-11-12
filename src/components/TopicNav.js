import { useEffect, useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./TopicNav.css";

// 주제로 거르기. 같은 목록을 화면 폭에 따라 두 모양으로 보인다.
// - 좁은 화면: 위에 붙어 옆으로 미는 한 줄(TopicStrip)
// - 넓은 화면: 본문 옆에 서 있는 목록(TopicIndex)
// 둘 다 링크라서 고른 주제가 주소(?tag=)에 남는다. hrefFor 는 찾는 말(?q=)을 지키며 주소를 만든다.

function items(topics, total) {
  return [{ key: null, count: total }, ...topics];
}

function Count({ value }) {
  return (
    <span className="tnum">
      {value}
      <span className="sr-only">편</span>
    </span>
  );
}

export function TopicStrip({ topics, total, selected, hrefFor }) {
  const listRef = useRef(null);

  // 위에 붙은 줄이 키보드 포커스를 가리지 않게 그만큼 비켜 스크롤한다(base.css).
  useEffect(() => {
    document.documentElement.classList.add("has-top-bar");
    return () => document.documentElement.classList.remove("has-top-bar");
  }, []);

  // 고른 주제가 줄 밖에 있으면 가운데로 민다. 쪽 전체가 따라 움직이지 않게 줄만 옮긴다.
  useLayoutEffect(() => {
    const list = listRef.current;
    const current = list && list.querySelector('[aria-current="true"]');
    if (!current) return;
    list.scrollLeft = current.offsetLeft - (list.clientWidth - current.offsetWidth) / 2;
  }, [selected]);

  return (
    <nav className="topic-strip" aria-label="주제별로 보기">
      <ul ref={listRef} className="topic-strip__list">
        {items(topics, total).map((t) => (
          <li key={t.key || "*"}>
            <Link
              to={hrefFor(t.key)}
              replace
              className="chip"
              aria-current={(selected || null) === t.key ? "true" : undefined}
            >
              {t.key || "전체"}
              <span className="chip__count">
                <Count value={t.count} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function TopicIndex({ topics, total, selected, hrefFor }) {
  return (
    <nav className="topic-index" aria-labelledby="topic-index-title">
      <h2 id="topic-index-title" className="rail-title">
        주제
      </h2>
      <ul className="topic-index__list">
        {items(topics, total).map((t) => (
          <li key={t.key || "*"}>
            <Link
              to={hrefFor(t.key)}
              replace
              className="topic-index__item"
              aria-current={(selected || null) === t.key ? "true" : undefined}
            >
              <span className="topic-index__name">{t.key || "전체"}</span>
              <span className="topic-index__count">
                <Count value={t.count} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
