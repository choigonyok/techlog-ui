// 글꼴은 가변 글꼴 두 벌이다. Wanted Sans 는 한 벌로 본문(400)부터 큰 제목(800)까지 쓰고,
// 한글은 유니코드 구간별 조각으로 나뉘어 있어 화면에 나온 글자의 조각만 받는다.
// JetBrains Mono 는 코드에만 쓴다.
import "wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
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
