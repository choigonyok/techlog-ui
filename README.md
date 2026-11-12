# techlog-ui

[techlog](https://github.com/choigonyok/techlog)의 화면입니다. Create React App과 React Router(데이터 라우터)로 만들었고, [tech.choigonyok.com](https://tech.choigonyok.com)에서 Cloudflare Worker(부모 저장소의 `worker/`)가 이 빌드를 정적 자산으로 내보냅니다.

## 실행

API 는 같은 출처의 `/api/*` 를 부릅니다. 로컬에서는 부모 저장소의 Worker 를 띄웁니다.

```bash
npm install
npm run build                       # build/ — Worker 가 이 폴더를 정적 자산으로 쓴다
(cd ../worker && npm install && npm run dev)   # 화면과 API :8787 (처음이면 ../worker/README 의 '로컬 데이터')
npm start                           # 고치면서 볼 때. :3000 의 /api 요청을 :8787 로 넘긴다(package.json proxy)
npm test                            # 순수 로직 단위 시험(Jest)
```

다른 곳의 API 를 쓰려면 빌드할 때 `REACT_APP_HOST=https://…` 를 줍니다.

### E2E 시험(Cypress)

```bash
npm run build && (cd ../worker && npm run dev)          # :8787
CYPRESS_ADMIN_TOKEN=$(cd ../worker && node scripts/dev-token.mjs) npm run e2e
```

VS Code 터미널처럼 `ELECTRON_RUN_AS_NODE` 가 켜진 곳에서는 `env -u ELECTRON_RUN_AS_NODE` 를 앞에 붙입니다. 관리 화면 시험은 토큰이 있을 때만 돕니다.

## 구조

```
src/
  App.js         라우트. 홈만 첫 묶음에 넣고, 글·관리·로그인 화면은 들어갈 때 받는다
  api.js         글 목록·방문 수(첫 화면)   postApi.js 글 한 편·그림 주소   adminApi.js 쓰기·로그인
  components/    레이아웃(스크롤 기억·포커스), 주제 메시, 칩, 글 목록, 글 머리, 본문 렌더러(Prose),
                 목차, 확인창, 오류 안내
  pages/         홈, 글, 로그인, 콜백, admin/(관리 목록·글쓰기·썸네일 고르기)
  lib/           주제 그래프, 메시 배치, 날짜, 글자 수, 본문 트리 처리, 임시 저장
  styles/        색·글꼴 토큰(tokens.css)과 기본 스타일
public/_headers  해시가 붙은 묶음(/static/*)을 오래 캐시하게 하는 Cloudflare 정적 자산 설정
cypress/e2e/     주요 흐름 E2E 시험
```

## 디자인 원칙

- 홈에서 눈에 띄는 것은 주제 메시 하나입니다. 태그는 노드, 같은 글에 함께 붙은 태그는 선입니다. 노드를 누르면 그 주제로 거르고(`/?tag=`), 목록의 글에 포인터를 올리면 그 글의 주제가 밝아집니다.
- 메시와 코드 블록처럼 기계가 낸 것은 남색 패널, 사람이 쓴 글은 밝은 바탕에 둡니다.
- 신호 주황(`--signal`, 흰 글자와 4.68:1)은 지금 선택된 것에만 씁니다. 고른 칩, 고른 노드, 지금 읽는 절, 고른 썸네일입니다.
- 글꼴은 IBM Plex Sans KR 400·600과 코드용 Plex Mono입니다. 굵기마다 한글 유니코드 구간 정의가 붙어 CSS 가 커지므로 굵기를 두 단계로만 둡니다.
- 본문은 넓은 화면에서 18px, 한 줄 약 38자(`--measure`)이고, 한국어는 어절 단위로 줄을 바꿉니다(`word-break: keep-all`).
- 주제는 쿠버네티스 레이블처럼 소문자로 보입니다. 대소문자만 다른 태그(`ISTIO`, `istio`)는 한 주제로 묶습니다.
- 다크 모드는 시스템 설정을 따릅니다. 색은 `styles/tokens.css` 한 곳에서 바꿉니다.
- 손가락으로 누르는 요소는 44px 이상입니다(마우스가 주 입력이면 36px).
- 첫 화면 JS 는 gzip 75KB 안팎입니다. 홈 묶음에 코드를 더하면 바로 넘으니, 다른 화면에서만 쓰는 코드는 그 화면 모듈에 둡니다.

## 관리 화면

- 글쓰기는 `/admin/write`, 고치기는 `/admin/posts/:id` 입니다. 제목·부제는 40자까지이고 글자 수를 보여 줍니다.
- 썸네일은 추가한 이미지 가운데 직접 고르며, 고른 한 장만 올라갑니다.
- 본문 그림은 `![설명](https://…)` 처럼 주소로 넣으면 저장할 때 서버가 내려받아 R2 에 옮겨 둡니다.
- 새 글은 이 브라우저에 임시 저장되고, 저장하지 않고 나가려 하면 확인을 받습니다.
