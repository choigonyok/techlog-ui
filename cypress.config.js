const { defineConfig } = require("cypress");

// 로컬 Worker(../worker 의 npm run dev, :8787)가 내보내는 화면과 API 를 시험한다. README 의 'E2E 시험' 참고.
module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:8787",
    video: false,
    viewportWidth: 1440,
    viewportHeight: 900,
  },
});
