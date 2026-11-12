// 로컬 Worker 위에서 도는 주요 흐름 시험. 관리 화면 시험은 CYPRESS_ADMIN_TOKEN 이 있을 때만 돈다
// (../worker 에서 node scripts/dev-token.mjs 로 만든다).

const noSidewaysScroll = () =>
  cy.document().then((doc) => {
    expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
  });

describe("홈", () => {
  it("목록은 날짜순, 주제를 고르면 주소에 남고 그 글만 보인다", () => {
    cy.visit("/");
    cy.get(".home .entry__date[datetime]").then(($dates) => {
      const dates = [...$dates].map((el) => el.getAttribute("datetime"));
      expect(dates).to.deep.equal([...dates].sort().reverse());
    });
    cy.contains(".topic-index__item", /^istio/).click();
    cy.location("search").should("eq", "?tag=istio");
    cy.get('.topic-index__item[aria-current="true"]').should("contain.text", "istio");
    cy.get(".home .entry__topics").each(($topics) => expect($topics.text()).to.contain("istio"));
    cy.get('[aria-live="polite"]').should("contain.text", "istio 주제의 글");
    // 기록 그림도 고른 주제의 글만 센다.
    cy.get(".record__count").should("contain.text", "istio");
  });

  it("기록 그림은 글이 쌓여 온 것을 말로도 알려 준다", () => {
    cy.visit("/");
    cy.get(".record__chart").should("have.attr", "aria-label").and("contain", "글이 쌓여 온 기록");
    cy.get(".record__cell").should("have.length.greaterThan", 20);
    cy.get(".record__caption").should("contain.text", "글을 썼습니다");
  });

  it("찾는 말을 치면 바로 걸러지고 주소에 남는다", () => {
    cy.visit("/");
    cy.get(".search__input").type("iptables");
    cy.get(".home .entry").should("have.length", 1).and("contain.text", "iptables");
    cy.location("search").should("eq", "?q=iptables");
    cy.get(".search__clear").click();
    cy.get(".home .entry").should("have.length.greaterThan", 10);
    cy.location("search").should("eq", "");
    cy.get(".search__input").type("이런글은없다");
    cy.get(".home__empty").should("contain.text", "글이 없습니다");
  });

  it("글을 보고 돌아오면 필터와 스크롤 위치가 그대로다", () => {
    cy.visit("/?tag=kubernetes");
    cy.get(".home .entry").eq(8).scrollIntoView();
    cy.window().then((win) => {
      const before = Math.round(win.scrollY);
      // Cypress 가 누르기 전에 스스로 스크롤하지 않게 해서, 적어 둔 위치가 누를 때의 위치가 되게 한다.
      cy.get(".home .entry").eq(8).find(".entry__title a").click({ scrollBehavior: false });
      cy.get(".prose").should("exist");
      cy.focused().should("have.id", "main-content");
      cy.go("back");
      cy.location("search").should("eq", "?tag=kubernetes");
      cy.window()
        .its("scrollY")
        .should((y) => expect(Math.abs(Math.round(y) - before)).to.be.at.most(2));
    });
  });

  it("좁은 화면에서는 주제가 위에 붙는 한 줄이 되고, 쪽이 옆으로 넘치지 않는다", () => {
    cy.viewport(390, 844);
    cy.visit("/?tag=kubernetes");
    cy.get(".topic-index").should("not.be.visible");
    cy.get('.topic-strip .chip[aria-current="true"]').should("be.visible").and("contain.text", "kubernetes");
    noSidewaysScroll();
    cy.scrollTo(0, 1500);
    cy.get(".topic-strip").should(($strip) => expect(Math.round($strip[0].getBoundingClientRect().top)).to.eq(0));
  });
});

describe("글", () => {
  it("목차가 지금 읽는 절을 표시한다", () => {
    cy.visit("/");
    cy.contains(".entry__title a", "운영환경 도커파일").click();
    cy.get("nav.toc a").should("have.length.greaterThan", 3);
    cy.contains("nav.toc a", "Summary").click();
    cy.get('nav.toc a[aria-current="location"]').should("contain.text", "Summary");
    // 코드 블록은 코드 판(--code) 위에 놓인다. 테마에 따라 값이 달라 변수와 비교한다.
    cy.document().then((doc) => {
      const probe = doc.createElement("div");
      probe.style.backgroundColor = "var(--code)";
      doc.body.appendChild(probe);
      const panel = getComputedStyle(probe).backgroundColor;
      probe.remove();
      cy.get(".code").first().should("have.css", "background-color", panel);
    });
  });

  it("앞뒤 글로 이어 읽고, 같은 주제의 글을 본다", () => {
    cy.visit("/");
    cy.contains(".entry__title a", "운영환경 도커파일").click();
    cy.get("#post-title").should("contain.text", "운영환경 도커파일");
    cy.get(".related .entry").should("have.length.greaterThan", 0);
    cy.get(".post-nav__link--older .post-nav__title").then(($title) => {
      const older = $title.text();
      cy.get(".post-nav__link--older").click();
      cy.get("#post-title").should("have.text", older);
      cy.window().its("scrollY").should("eq", 0);
    });
  });

  it("좁은 화면에서는 목차가 위에 붙는 막대가 되고, 쪽이 옆으로 넘치지 않는다", () => {
    cy.viewport(390, 844);
    cy.visit("/");
    cy.contains(".entry__title a", "운영환경 도커파일").click();
    cy.get("nav.toc").should("not.be.visible");
    noSidewaysScroll();
    cy.get(".toc-bar__toggle").click();
    cy.contains("#toc-sheet a", "Summary").click();
    cy.get("#toc-sheet").should("not.be.visible");
    cy.get(".toc-bar__current").should("contain.text", "Summary");
  });
});

describe("화면 밝기", () => {
  it("고른 테마를 기억한다", () => {
    cy.visit("/", { onBeforeLoad: (win) => win.localStorage.removeItem("techlog:theme") });
    cy.get("html")
      .invoke("attr", "data-theme")
      .then((system) => {
        const other = system === "dark" ? "light" : "dark";
        cy.get(".site-header__tool").click();
        cy.get("html").should("have.attr", "data-theme", other);
        cy.reload();
        cy.get("html").should("have.attr", "data-theme", other);
        // 시스템 설정과 같은 쪽으로 돌아오면 기억을 지운다.
        cy.get(".site-header__tool").click();
        cy.get("html").should("have.attr", "data-theme", system);
        cy.window().then((win) => expect(win.localStorage.getItem("techlog:theme")).to.eq(null));
      });
  });
});

describe("관리", () => {
  const token = Cypress.env("ADMIN_TOKEN");

  before(function skipWithoutToken() {
    if (!token) this.skip();
  });

  beforeEach(() => {
    cy.visit("/", { onBeforeLoad: (win) => win.localStorage.setItem("jwt_token", token) });
  });

  it("처음 들어오면 글 목록이 보이고, 삭제 전에 확인을 받는다", () => {
    cy.visit("/admin");
    cy.get(".admin-row").should("have.length.greaterThan", 10);
    cy.get(".admin-row").first().contains("button", "삭제").click();
    cy.get("dialog[open]").should("contain.text", "이 글을 삭제할까요?");
    cy.get("dialog[open]").contains("button", "취소").click();
    cy.get("dialog[open]").should("not.exist");
  });

  it("제목은 40자까지 세어 보여 주고, 넘으면 저장하지 않는다", () => {
    cy.visit("/admin/write");
    cy.get("#f-title").type("가".repeat(41), { delay: 0 });
    cy.get("#f-title-count").should("have.attr", "data-over", "true").and("contain.text", "41/40");
    cy.contains("button", "글 올리기").click();
    cy.focused().should("have.id", "f-title");
  });

  it("미리보기는 글 화면과 같은 머리와 본문으로 보인다", () => {
    cy.visit("/admin/write");
    cy.get("#f-title").type("미리보기 시험", { delay: 0 });
    cy.get("#f-text").type("## 첫 절{enter}{enter}본문 한 줄", { delay: 0 });
    cy.get(".preview .post-header__title").should("have.text", "미리보기 시험");
    cy.get(".preview .prose h3").should("have.text", "첫 절");
  });
});
