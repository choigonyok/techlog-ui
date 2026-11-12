import { Link } from "react-router-dom";
import "./PostList.css";

// 글 화면 묶음(본문 렌더러 포함)은 처음 화면에서 받지 않는다. 글에 포인터를 올리거나
// 포커스가 가면 미리 받아 두어 누를 때 기다림을 줄인다.
export function preloadPostPage() {
  import("../pages/Post");
}

export default function PostList({ posts, selected, onActivePost, headingLevel = 3, from }) {
  const Heading = `h${headingLevel}`;
  const enter = (post) => {
    preloadPostPage();
    if (onActivePost) onActivePost(post);
  };
  const leave = () => {
    if (onActivePost) onActivePost(null);
  };

  return (
    <ul className="post-list">
      {posts.map((post) => (
        <li
          key={post.id}
          className="post-row"
          onMouseEnter={() => enter(post)}
          onMouseLeave={leave}
          onFocus={() => enter(post)}
          onBlur={leave}
        >
          <time className="post-row__date tnum" dateTime={post.date || undefined}>
            {post.date || "날짜 없음"}
          </time>
          <div className="post-row__body">
            <Heading className="post-row__title">
              <Link to={`/posts/${encodeURIComponent(post.id)}`} state={from ? { from } : undefined}>
                {post.title || "제목 없음"}
              </Link>
            </Heading>
            {post.subtitle && <p className="post-row__subtitle">{post.subtitle}</p>}
            {post.topics.length > 0 && (
              <p className="post-row__topics">
                <span className="sr-only">주제: </span>
                {post.topics.map((t, i) => (
                  <span key={t} className={t === selected ? "is-selected" : undefined}>
                    {i > 0 ? ", " : ""}
                    {t}
                  </span>
                ))}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
