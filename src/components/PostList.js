import { Link } from "react-router-dom";
import { formatDay, formatDots, formatMonth, groupByMonth } from "../lib/dates";
import "./PostList.css";

// 글 화면 묶음(본문 렌더러 포함)은 처음 화면에서 받지 않는다. 글에 포인터를 올리거나
// 포커스가 가면 미리 받아 두어 누를 때 기다림을 줄인다.
export function preloadPostPage() {
  import("../pages/Post");
}

function Entry({ post, date, selected, headingLevel, from }) {
  const Heading = `h${headingLevel}`;
  return (
    <li className="entry" onMouseEnter={preloadPostPage} onFocus={preloadPostPage}>
      <time className="entry__date tnum" dateTime={post.date || undefined}>
        {date}
      </time>
      <div className="entry__body">
        <Heading className="entry__title">
          <Link to={`/posts/${encodeURIComponent(post.id)}`} state={from ? { from } : undefined}>
            {post.title || "제목 없음"}
          </Link>
        </Heading>
        {post.subtitle && <p className="entry__subtitle">{post.subtitle}</p>}
      </div>
      {post.topics.length > 0 && (
        <p className="entry__topics">
          <span className="sr-only">주제: </span>
          {post.topics.map((t, i) => (
            <span key={t} className={t === selected ? "is-selected" : undefined}>
              {i > 0 && <span className="sr-only">, </span>}
              {t}
            </span>
          ))}
        </p>
      )}
    </li>
  );
}

// 달마다 묶은 목록. 달 이름이 왼쪽에 서고, 그 달의 글이 날짜순으로 이어진다.
export function MonthlyList({ posts, selected, from }) {
  return (
    <div className="months">
      {groupByMonth(posts).map((group) => {
        const id = `month-${group.key || "none"}`;
        return (
          <section key={group.key} className="month" aria-labelledby={id}>
            <div className="month__head">
              <h3 id={id} className="month__name tnum">
                {formatMonth(group.key)}
              </h3>
              <p className="month__count tnum">{group.posts.length}편</p>
            </div>
            <ul className="entries">
              {group.posts.map((post) => (
                <Entry
                  key={post.id}
                  post={post}
                  date={formatDay(post.date)}
                  selected={selected}
                  headingLevel={4}
                  from={from}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// 묶지 않은 짧은 목록(같은 주제의 글). 줄마다 날짜를 다 적는다.
export default function PostList({ posts, headingLevel = 3, from }) {
  return (
    <ul className="entries entries--flat">
      {posts.map((post) => (
        <Entry
          key={post.id}
          post={post}
          date={formatDots(post.date) || "날짜 없음"}
          headingLevel={headingLevel}
          from={from}
        />
      ))}
    </ul>
  );
}
