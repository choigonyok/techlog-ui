const { defineConfig } = require("cypress");

// 모의 서버(mock/server.mjs)로 띄운 화면을 시험한다. README 의 'E2E 시험' 참고.
module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:3000",
    video: false,
    viewportWidth: 1440,
    viewportHeight: 900,
  },
});
