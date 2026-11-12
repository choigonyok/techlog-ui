// 새 글은 이 브라우저에 임시 저장한다. 저장소를 쓸 수 없는 환경(사생활 보호 창 등)에서는
// 조용히 건너뛰고 화면은 그대로 동작한다. 이미지 파일은 담지 않는다.
const KEY = "techlog:draft:new";

export function loadDraft() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    return draft && typeof draft === "object" ? draft : null;
  } catch {
    return null;
  }
}

export function saveDraft(fields) {
  const savedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...fields, savedAt }));
    return savedAt;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 지우지 못해도 다음에 열 때 불러오기만 다시 묻는다.
  }
}

export function isEmptyDraft(fields) {
  return !fields || !["title", "subtitle", "tags", "text"].some((k) => String(fields[k] ?? "").trim());
}
