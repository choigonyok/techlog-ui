// 로컬 Worker 위에서 도는 주요 흐름 시험. 관리 화면 시험은 CYPRESS_ADMIN_TOKEN 이 있을 때만 돈다
// (../worker 에서 node scripts/dev-token.mjs 로 만든다).

describe("홈", () => {
  it("목록은 날짜순, 주제를 고르면 주소에 남고 그 글만 보인다", () => {
    cy.visit("/");
    cy.get(".home .post-row__date[datetime]").then(($dates) => {
      const dates = [...$dates].map((el) => el.getAttribute("datetime"));
      expect(dates).to.deep.equal([...dates].sort().reverse());
    });
    cy.contains(".chip", /^istio/).click();
    cy.location("search").should("eq", "?tag=istio");
    cy.get('.chip[aria-current="true"]').should("contain.text", "istio");
    cy.get('.mesh__node[aria-current="true"]').should("contain.text", "istio");
    cy.get(".home .post-row__topics").each(($topics) => expect($topics.text()).to.contain("istio"));
    cy.get('[aria-live="polite"]').should("contain.text", "istio 주제의 글");
  });

  it("메시 노드는 함께 쓰인 주제를 이름으로 알려 준다", () => {
    cy.visit("/");
    cy.contains(".mesh__node", /^kubernetes/).should("contain.text", "함께 쓰인 주제:");
  });

  it("글을 보고 돌아오면 필터와 스크롤 위치가 그대로다", () => {
    cy.visit("/?tag=kubernetes");
    cy.get(".home .post-row").eq(8).scrollIntoView();
    cy.window().then((win) => {
      const before = Math.round(win.scrollY);
      // Cypress 가 누르기 전에 스스로 스크롤하지 않게 해서, 적어 둔 위치가 누를 때의 위치가 되게 한다.
      cy.get(".home .post-row").eq(8).find(".post-row__title a").click({ scrollBehavior: false });
      cy.get(".prose").should("exist");
      cy.focused().should("have.id", "main-content");
      cy.go("back");
      cy.location("search").should("eq", "?tag=kubernetes");
      cy.window().its("scrollY").should((y) => expect(Math.abs(Math.round(y) - before)).to.be.at.most(2));
    });
  });
});

describe("글", () => {
  it("목차가 지금 읽는 절을 표시한다", () => {
    cy.visit("/");
    cy.contains(".post-row__title a", "운영환경 도커파일").click();
    cy.get("nav.toc a").should("have.length.greaterThan", 3);
    cy.contains("nav.toc a", "Summary").click();
    cy.get('nav.toc a[aria-current="location"]').should("contain.text", "Summary");
    // 코드 블록은 남색 패널(--panel). 시스템 테마(라이트·다크)에 따라 값이 달라 변수와 비교한다.
    cy.document().then((doc) => {
      const probe = doc.createElement("div");
      probe.style.backgroundColor = "var(--panel)";
      doc.body.appendChild(probe);
      const panel = getComputedStyle(probe).backgroundColor;
      probe.remove();
      cy.get(".code").first().should("have.css", "background-color", panel);
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
});
