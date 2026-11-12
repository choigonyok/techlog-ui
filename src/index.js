// 글꼴은 두 굵기(400 본문, 600 제목)만 싣는다. 굵기마다 한글 유니코드 구간 정의가 붙어
// CSS 가 커지기 때문이다. Plex Mono 는 코드에만 쓰므로 라틴 글자만 싣는다.
import "@fontsource/ibm-plex-sans-kr/400.css";
import "@fontsource/ibm-plex-sans-kr/600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./styles/tokens.css";
import "./styles/base.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
