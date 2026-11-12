import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigation, useNavigationType } from "react-router-dom";
import { getVisitors } from "../api";
import { currentTheme, followSystemTheme, setTheme } from "../lib/theme";
import Icon from "./Icon";
import "./Layout.css";

// 사이트 표시: 한 칸씩 오르는 계단. 기록 그림의 계단선과 같은 모양이다.
function Mark() {
  return (
    <svg className="wordmark__mark" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
      <path
        d="M3 17h5v-5h5V7h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThemeToggle() {
  const [theme, setShown] = useState(currentTheme);
  useEffect(() => followSystemTheme(setShown), []);

  const next = theme === "dark" ? "light" : "dark";
  const toggle = () => {
    setTheme(next);
    setShown(next);
  };

  return (
    <button
      type="button"
      className="icon-button site-header__tool"
      onClick={toggle}
      aria-label={next === "dark" ? "어두운 화면으로 바꾸기" : "밝은 화면으로 바꾸기"}
    >
      <Icon name={next === "dark" ? "moon" : "sun"} />
    </button>
  );
}

function Header() {
  return (
    <header className="site-header on-field">
      <div className="wrap site-header__inner">
        <Link to="/" className="wordmark">
          <Mark />
          techlog
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}

function Footer() {
  const [visitors, setVisitors] = useState(null);
  useEffect(() => {
    let alive = true;
    getVisitors()
      .then((data) => {
        if (alive && data && Number.isFinite(data.today) && Number.isFinite(data.total)) setVisitors(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const n = (v) => v.toLocaleString("ko-KR");
  return (
    <footer className="site-footer on-field">
      <div className="wrap site-footer__inner">
        <p>© 2023 최윤석</p>
        {visitors && (
          <p className="tnum">
            오늘 {n(visitors.today)}명, 지금까지 {n(visitors.total)}명이 다녀갔습니다.
          </p>
        )}
        <Link to="/admin" className="site-footer__link">
          관리
        </Link>
      </div>
    </footer>
  );
}

// 화면이 바뀌면 포커스를 본문으로 옮겨 화면 낭독기가 새 내용부터 읽게 한다.
// 같은 화면에서 거르는 조건만 바뀔 때(?tag=, ?q=)는 옮기지 않는다.
function useFocusMainOnRouteChange(mainRef) {
  const { pathname } = useLocation();
  const shown = useRef(pathname);
  useEffect(() => {
    // 처음 연 화면에서는 옮기지 않는다(효과가 두 번 돌아도 같은 경로면 건너뛴다).
    if (shown.current === pathname) return;
    shown.current = pathname;
    if (mainRef.current) mainRef.current.focus({ preventScroll: true });
  }, [pathname, mainRef]);
}

const SCROLL_KEY = "techlog:scroll";

// 기록 항목(location.key)마다 보던 위치를 기억했다가 뒤로·앞으로 가기에서 되살린다.
// 새로 들어온 화면은 맨 위에서, 주소에 #이 있으면 그 절에서 시작한다. 같은 화면에서 기록을 바꿔 치우는
// 이동(거르는 조건 ?tag= 와 ?q= 는 replace 로 바뀐다)은 보던 자리를 그대로 둔다.
// 화면은 로더가 데이터를 받은 뒤에 그려지므로, 되살릴 때는 이미 목록 높이가 다 차 있다.
function useScrollMemory() {
  const location = useLocation();
  const type = useNavigationType();
  const memory = useRef(null);
  const shown = useRef(null);
  if (!memory.current) {
    try {
      memory.current = JSON.parse(sessionStorage.getItem(SCROLL_KEY)) || {};
    } catch {
      memory.current = {};
    }
  }

  useEffect(() => {
    window.history.scrollRestoration = "manual";
    const onScroll = () => {
      if (shown.current) memory.current[shown.current.key] = window.scrollY;
    };
    // 새로고침해도 이어지도록 페이지를 떠날 때 저장한다.
    const persist = () => {
      try {
        sessionStorage.setItem(SCROLL_KEY, JSON.stringify(memory.current));
      } catch {
        // 저장소를 못 쓰면 이번 탭 안에서만 기억한다.
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", persist);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", persist);
    };
  }, []);

  useLayoutEffect(() => {
    const prev = shown.current;
    if (prev && prev.key === location.key) return;
    shown.current = { key: location.key, path: location.pathname };
    const saved = memory.current[location.key];
    const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (type === "POP" && saved != null) window.scrollTo(0, saved);
    else if (target) target.scrollIntoView();
    else if (prev && (type === "PUSH" || prev.path !== location.pathname)) window.scrollTo(0, 0);
    memory.current[location.key] = window.scrollY;
  }, [location, type]);
}

export default function Layout() {
  const mainRef = useRef(null);
  const navigation = useNavigation();
  useFocusMainOnRouteChange(mainRef);
  useScrollMemory();

  return (
    <>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <div className="nav-progress" data-busy={navigation.state !== "idle"} aria-hidden="true" />
      <Header />
      <main id="main-content" ref={mainRef} tabIndex={-1} className="site-main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
