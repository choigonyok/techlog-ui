import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLoaderData, useSearchParams } from "react-router-dom";
import { cachedPosts, getPosts } from "../api";
import Icon from "../components/Icon";
import { MonthlyList } from "../components/PostList";
import Record from "../components/Record";
import { TopicIndex, TopicStrip } from "../components/TopicNav";
import profile from "../assets/profile.jpg";
import { compareByDateDesc } from "../lib/dates";
import { useDocumentTitle } from "../lib/hooks";
import { matchesSearch, searchTerms } from "../lib/search";
import { countTopics, topicKey } from "../lib/topics";
import "./Home.css";

// 받아 둔 목록이 있으면 기다리지 않는다. 글을 보고 돌아왔을 때 목록이 같은 높이로 바로 그려져야
// 스크롤 위치가 그대로 돌아온다.
export function homeLoader() {
  const cached = cachedPosts();
  if (cached) return { posts: cached };
  return getPosts().then((posts) => ({ posts }));
}

// 거르는 조건(?tag=, ?q=)만 바뀔 때는 목록을 다시 받지 않는다. 글자를 칠 때마다 이동 표시가 깜빡이지 않는다.
export function homeShouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }) {
  if (currentUrl.pathname === nextUrl.pathname) return false;
  return defaultShouldRevalidate;
}

function homeSearch({ tag, q }) {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (q) params.set("q", q);
  const text = params.toString();
  return text ? `/?${text}` : "/";
}

function Intro() {
  return (
    <div className="hero__text">
      <h1 id="intro-title" className="hero__title">
        꾸준함이란 도구로 성장하기를 즐기는 DevSecOps 엔지니어 최윤석입니다.
      </h1>
      <div className="who">
        <img className="who__photo" src={profile} alt="" width="48" height="48" />
        <div className="who__text">
          <dl className="who__history">
            <div>
              <dt className="tnum">2017.03 – 2025.02</dt>
              <dd>Kyunghee Univ. Computer Engineering</dd>
            </div>
            <div>
              <dt className="tnum">2024.03 – 2024.08</dt>
              <dd>SLEXN, inc. Internship (Infrastructure Engineer)</dd>
            </div>
          </dl>
          <ul className="who__links">
            <li>
              <a href="https://github.com/choigonyok">GitHub</a>
            </li>
            <li>
              <a href="https://www.instagram.com/choigonyok">Instagram</a>
            </li>
            <li>
              <a href="https://www.youtube.com/channel/UCjcaraxwh4Fz6KYJwfE0-Hg">YouTube</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// 처음 열 때 글 목록을 기다리는 동안의 화면. 소개는 목록 없이도 그릴 수 있으니 먼저 보이고,
// 기록 그림 자리는 비워 두어 목록이 오면 머리의 높이가 그대로다.
export function HomeFallback() {
  return (
    <>
      <section className="page-head on-field hero" aria-labelledby="intro-title">
        <div className="wrap hero__inner">
          <Intro />
          <div className="record" aria-hidden="true">
            <p className="record__caption">
              <strong className="record__count">&nbsp;</strong>
            </p>
            <div className="record__plot" />
          </div>
        </div>
      </section>
      <p className="wrap page-waiting" role="status">
        글 목록을 불러오는 중입니다.
      </p>
    </>
  );
}

// 찾는 말은 치는 대로 바로 거르고, 주소(?q=)에는 조금 뒤에 남긴다. 한글을 조합하는 동안
// 주소가 입력을 되돌려 쓰지 않도록 입력값은 이 화면이 따로 쥔다.
function useSearchText(params, setParams) {
  const inUrl = params.get("q") || "";
  const [text, setText] = useState(inUrl);
  const written = useRef(inUrl);

  // 뒤로 가기처럼 바깥에서 주소가 바뀌면 입력값을 맞춘다.
  useEffect(() => {
    if (inUrl !== written.current) {
      written.current = inUrl;
      setText(inUrl);
    }
  }, [inUrl]);

  useEffect(() => {
    const next = text.trim();
    if (next === written.current) return undefined;
    const timer = window.setTimeout(() => {
      written.current = next;
      setParams(
        (prev) => {
          const out = new URLSearchParams(prev);
          if (next) out.set("q", next);
          else out.delete("q");
          return out;
        },
        { replace: true }
      );
    }, 250);
    return () => window.clearTimeout(timer);
  }, [text, setParams]);

  return [text, setText];
}

function SearchBox({ value, onChange }) {
  const inputRef = useRef(null);

  // '/' 를 누르면 찾기 칸으로 간다(다른 칸에 쓰는 중이면 그대로 둔다).
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const el = event.target;
      if (el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      event.preventDefault();
      if (inputRef.current) inputRef.current.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="search">
      <Icon name="search" size={18} className="search__icon" />
      <input
        ref={inputRef}
        type="search"
        className="search__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="제목·주제로 찾기"
        aria-label="글 찾기"
        autoComplete="off"
        enterKeyHint="search"
      />
      {value ? (
        <button
          type="button"
          className="search__clear"
          aria-label="찾는 말 지우기"
          onClick={() => {
            onChange("");
            if (inputRef.current) inputRef.current.focus();
          }}
        >
          <Icon name="close" size={16} />
        </button>
      ) : (
        <kbd className="search__key" aria-hidden="true">
          /
        </kbd>
      )}
    </div>
  );
}

function listTitle(selected, query) {
  if (selected && query) return `${selected} 주제에서 ‘${query}’로 찾은 글`;
  if (query) return `‘${query}’로 찾은 글`;
  if (selected) return `${selected} 주제의 글`;
  return "글";
}

export default function Home() {
  const { posts } = useLoaderData();
  const [params, setParams] = useSearchParams();
  const selected = topicKey(params.get("tag")) || null;
  const [text, setText] = useSearchText(params, setParams);
  const query = useDeferredValue(text).trim();

  const topics = useMemo(() => countTopics(posts), [posts]);
  const sorted = useMemo(() => [...posts].sort(compareByDateDesc), [posts]);
  const visible = useMemo(() => {
    const terms = searchTerms(query);
    return sorted.filter((p) => (!selected || p.topics.includes(selected)) && matchesSearch(p, terms));
  }, [sorted, selected, query]);
  const known = !selected || topics.some((t) => t.key === selected);

  useDocumentTitle(selected ? `${selected} 주제의 글` : null);

  // 거르는 조건이 바뀌면 결과 수를 화면 낭독기에 읽어 준다. 처음 열 때는 읽지 않는다.
  const [announcement, setAnnouncement] = useState("");
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setAnnouncement(
      `${listTitle(selected, query) === "글" ? "전체 글" : listTitle(selected, query)} ${visible.length}편을 보여 줍니다.`
    );
  }, [selected, query, visible.length]);

  const hrefFor = (key) => homeSearch({ tag: key, q: text.trim() });
  const nav = { topics, total: posts.length, selected, hrefFor };

  return (
    <>
      <section className="page-head on-field hero" aria-labelledby="intro-title">
        <div className="wrap hero__inner">
          <Intro />
          <Record posts={posts} topic={selected && known ? selected : null} />
        </div>
      </section>

      <div className="wrap split home">
        {/* 거르는 주제가 목록보다 먼저 읽히고 먼저 포커스를 받도록 레일을 앞에 둔다. 놓이는 자리는 CSS 가 정한다. */}
        <div className="split__rail">
          <div className="split__sticky">
            <TopicIndex {...nav} />
          </div>
        </div>
        <section className="split__main" aria-labelledby="list-title">
          <div className="list-head">
            <div className="list-head__text">
              <h2 id="list-title" className="list-head__title">
                {listTitle(selected, query)}
              </h2>
              <p className="list-head__count tnum">{visible.length}편</p>
            </div>
            <SearchBox value={text} onChange={setText} />
          </div>
          <TopicStrip {...nav} />
          <p className="sr-only" role="status" aria-live="polite">
            {announcement}
          </p>
          {visible.length > 0 ? (
            <MonthlyList posts={visible} selected={selected} from="home" />
          ) : (
            <div className="home__empty">
              <p>
                {posts.length === 0
                  ? "아직 올린 글이 없습니다."
                  : query
                    ? `‘${query}’가 제목·부제·주제에 들어간 글이 ${selected && known ? `${selected} 주제에 ` : ""}없습니다.`
                    : `‘${selected}’ 주제로 쓴 글이 없습니다.`}
              </p>
              <div className="home__empty-actions">
                {query && (
                  <button type="button" className="button" onClick={() => setText("")}>
                    찾는 말 지우기
                  </button>
                )}
                {selected && (
                  <Link to={homeSearch({ q: text.trim() })} replace className="button">
                    {query ? "전체 주제에서 찾기" : "전체 글 보기"}
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
