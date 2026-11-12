import { Link } from "react-router-dom";
import "./TopicChips.css";

// 메시와 같은 거르기를 한 줄 목록으로 보여 준다. 고른 칩만 신호색이다.
export default function TopicChips({ topics, total, selected }) {
  const chips = [{ key: null, count: total }, ...topics];
  return (
    <ul className="chips" aria-label="주제별로 보기">
      {chips.map((t) => (
        <li key={t.key || "*"}>
          <Link
            to={t.key ? `/?tag=${encodeURIComponent(t.key)}` : "/"}
            replace
            className="chip"
            aria-current={(selected || null) === t.key ? "true" : undefined}
          >
            {t.key || "전체"}
            <span className="chip__count tnum">
              {t.count}
              <span className="sr-only">편</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
