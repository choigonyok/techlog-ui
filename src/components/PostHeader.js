import { useState } from "react";
import { Link } from "react-router-dom";
import { formatLong } from "../lib/dates";
import "./PostHeader.css";

export function PostCover({ src }) {
  const [failed, setFailed] = useState(false);
  // 썸네일이 없는 글은 표지를 그리지 않는다.
  if (!src || failed) return null;
  return <img className="post-cover" src={src} alt="" decoding="async" onError={() => setFailed(true)} />;
}

// 글의 머리: 제목, 부제, 쓴 날, 읽는 시간, 주제. 판(초록 바탕) 위에 놓인다.
// 글 화면과 관리 화면 미리보기가 같이 쓴다. 미리보기에서는 제목 단계를 낮추고
// 주제를 링크로 만들지 않는다(누르면 쓰던 화면을 떠나게 되므로).
export default function PostHeader({ post, titleAs = "h1", titleId, linkTopics = true, minutes = 0 }) {
  const Title = titleAs;
  const hasMeta = post.date || minutes > 0 || post.topics.length > 0;
  return (
    <div className="post-header">
      <Title id={titleId} className="post-header__title">
        {post.title || "제목 없음"}
      </Title>
      {post.subtitle && <p className="post-header__subtitle">{post.subtitle}</p>}
      {hasMeta && (
        <div className="post-header__meta">
          {post.date && (
            <time className="tnum" dateTime={post.date}>
              {formatLong(post.date)}
            </time>
          )}
          {minutes > 0 && <span className="tnum">읽는 데 약 {minutes}분</span>}
          {post.topics.length > 0 && (
            <ul className="post-header__topics" aria-label="주제">
              {post.topics.map((t) => (
                <li key={t}>
                  {linkTopics ? <Link to={`/?tag=${encodeURIComponent(t)}`}>{t}</Link> : <span>{t}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
