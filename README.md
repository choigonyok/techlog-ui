# techlog-ui

[techlog](https://github.com/choigonyok/techlog)의 프런트엔드입니다. Create React App과 React Router(데이터 라우터)로 만들었습니다.

## 실행

```bash
npm install
REACT_APP_HOST=https://www.choigonyok.com npm start   # API 주소. 비우면 같은 출처의 /api 를 부른다
npm run build                                         # build/ 에 결과. 배포용 Dockerfile 은 이 폴더를 nginx 로 내보낸다
npm test                                              # 순수 로직 단위 시험(Jest)
```

### 백엔드 없이 띄우기

`mock/server.mjs` 는 Gin 백엔드를 흉내 내는 모의 서버입니다. 글 원고 저장소를 읽어 데이터를 만들고, 실제 서버의 버릇(아래 표)도 그대로 따라 합니다.

```bash
git clone https://github.com/choigonyok/techlog-posts /tmp/techlog-posts
node mock/server.mjs /tmp/techlog-posts            # API :8787
REACT_APP_HOST=http://localhost:8787 npm start      # 화면 :3000
```

관리 화면은 '관리 → GitHub으로 로그인'을 누르면 모의 서버가 `dev-token` 을 내줘 들어갈 수 있습니다.

### E2E 시험(Cypress)

```bash
REACT_APP_HOST=http://localhost:8787 npm run build
node mock/server.mjs /tmp/techlog-posts --static build   # API :8787, 화면 :3000
npm run e2e
```

VS Code 터미널처럼 `ELECTRON_RUN_AS_NODE` 가 켜진 곳에서는 `env -u ELECTRON_RUN_AS_NODE npm run e2e` 로 실행합니다.

## 구조

```
src/
  App.js         라우트. 홈만 첫 묶음에 넣고, 글·관리·로그인 화면은 들어갈 때 받는다
  api.js         글 목록·방문 수(첫 화면)   postApi.js 글 한 편·썸네일   adminApi.js 쓰기·로그인
  components/    레이아웃(스크롤 기억·포커스), 주제 메시, 칩, 글 목록, 글 머리, 본문 렌더러(Prose),
                 목차, 확인창, 오류 안내
  pages/         홈, 글, 로그인, 콜백, admin/(관리 목록·글쓰기·썸네일 고르기)
  lib/           주제 그래프, 메시 배치, 날짜, 글자 수, 본문 트리 처리, 임시 저장
  styles/        색·글꼴 토큰(tokens.css)과 기본 스타일
mock/            모의 API 서버
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

## 서버의 버릇과 화면의 대응

| 서버 동작 | 화면에서 하는 일 |
| --- | --- |
| 제목·부제는 `VARCHAR(40)`, 넘으면 저장하지 않고도 200 | 글자 수를 세어 보여 주고 40자를 넘으면 저장을 막는다 |
| 저장에 실패해도 200 을 보낼 때가 있다 | 저장 뒤 목록·글을 다시 읽어 실제로 저장됐는지 확인하고 아니면 알린다 |
| 태그·파일 이름을 SQL 문자열에 그대로 이어 붙인다 | 주제의 작은따옴표를 막고, 썸네일 파일은 안전한 이름으로 바꿔 올린다 |
| 본문 이미지를 주소로 내려받아 S3 에 다시 올린다 | `http(s)` 가 아닌 이미지 주소는 저장 전에 알린다 |
| 업로드 파일 중 `thumbnail_name` 과 이름이 같은 것만 썸네일이 된다 | 썸네일로 고른 한 장만 올린다 |
| 글 목록을 무작위 UUID 순으로 준다, 작성일 형식이 섞여 있다 | 작성일을 `YYYY-MM-DD` 로 맞춰 최근 글부터 정렬한다 |
| 없는 글도 200 과 빈 글을 준다 | id 가 비면 없는 글로 보고 안내한다 |
| `/api/visitor` 는 부를 때마다 오늘 방문 수를 올린다 | 한 번 불러온 화면에서 한 번만 부른다 |
| 관리자 토큰은 5분이면 만료된다 | 관리 화면 바깥에서 들어올 때만 확인한다 |
