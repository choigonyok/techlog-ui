import { useState } from "react";
import { Link } from "react-router-dom";
import "./PostHeader.css";

function Cover({ src }) {
  const [failed, setFailed] = useState(false);
  // 썸네일이 없는 글은 서버가 빈 응답을 보낸다. 이때는 자리를 비운다.
  if (!src || failed) return null;
  return <img className="post-cover" src={src} alt="" decoding="async" onError={() => setFailed(true)} />;
}

// 글 화면과 관리 화면 미리보기가 같은 머리를 쓴다. 미리보기에서는 제목 단계를 낮추고
// 주제를 링크로 만들지 않는다(누르면 쓰던 화면을 떠나게 되므로).
export default function PostHeader({ post, titleAs = "h1", titleId, linkTopics = true, coverSrc }) {
  const Title = titleAs;
  return (
    <header className="post-header">
      <Title id={titleId} className="post-header__title">
        {post.title || "제목 없음"}
      </Title>
      {post.subtitle && <p className="post-header__subtitle">{post.subtitle}</p>}
      {(post.date || post.topics.length > 0) && (
        <div className="post-header__meta">
          {post.date && (
            <time className="tnum" dateTime={post.date}>
              {post.date}
            </time>
          )}
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
      <Cover key={coverSrc || "none"} src={coverSrc} />
    </header>
  );
}
