import { useDeferredValue, useEffect, useRef, useState } from "react";
import { Link, useBlocker, useLoaderData, useNavigate } from "react-router-dom";
import { createPost, updatePost } from "../../adminApi";
import { getPost, thumbnailUrl } from "../../postApi";
import ConfirmDialog from "../../components/ConfirmDialog";
import PostHeader, { PostCover } from "../../components/PostHeader";
import Prose from "../../components/Prose";
import { formatClock, todayISO } from "../../lib/clock";
import { clearDraft, isEmptyDraft, loadDraft, saveDraft } from "../../lib/draft";
import { useDocumentTitle } from "../../lib/hooks";
import { readingMinutes } from "../../lib/reading";
import { charLength, findUnfetchableImages, parseTopicInput } from "../../lib/text";
import { topicsOf } from "../../lib/topics";
import ThumbnailPicker from "./ThumbnailPicker";

// 제목·부제는 DB 에서 VARCHAR(40) 이다. 넘기면 서버가 저장하지 못하고도 오류를 알리지 않는다.
const LIMIT = 40;
const EMPTY = { title: "", subtitle: "", tags: "", text: "" };

export async function loader({ params }) {
  if (!params.postId) return { post: null };
  const post = await getPost(params.postId, { fresh: true });
  if (!post) throw new Response("", { status: 404 });
  return { post };
}

function fieldsOf(post) {
  return { title: post.title, subtitle: post.subtitle, tags: post.tags.join(", "), text: post.text };
}

// 저장했다는 응답 뒤에 다시 읽어 보니 바뀌지 않았을 때
class NotConfirmed extends Error {}

let imageSeq = 0;

function Counter({ id, length }) {
  return (
    <span id={id} className="field__count" data-over={length > LIMIT}>
      {length}/{LIMIT}
      <span className="sr-only">자</span>
    </span>
  );
}

export function Component() {
  const { post } = useLoaderData();
  const isNew = !post;
  const navigate = useNavigate();
  useDocumentTitle(isNew ? "새 글 쓰기" : "글 수정");

  // 처음 값: 고치는 글이면 그 글, 새 글이면 임시 저장본(있으면)
  const [start] = useState(() => {
    const base = post ? fieldsOf(post) : EMPTY;
    if (!isNew) return { base, fields: base, restored: null };
    const draft = loadDraft();
    if (!draft || isEmptyDraft(draft)) return { base, fields: base, restored: null };
    const fields = {
      title: String(draft.title || ""),
      subtitle: String(draft.subtitle || ""),
      tags: String(draft.tags || ""),
      text: String(draft.text || ""),
    };
    return { base, fields, restored: { savedAt: draft.savedAt } };
  });
  const baseline = start.base;
  const restored = start.restored;
  const [fields, setFields] = useState(start.fields);
  const [images, setImages] = useState([]);
  const [thumb, setThumb] = useState(isNew ? null : "keep");
  const [mode, setMode] = useState("write");
  const [savedAt, setSavedAt] = useState(restored ? restored.savedAt : null);
  const [showRestored, setShowRestored] = useState(Boolean(restored));
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const leaving = useRef(false);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const update = (name) => (event) => setFields((f) => ({ ...f, [name]: event.target.value }));

  // 검사. 40자 초과·이미지 주소는 쓰는 동안 바로, 빈 칸은 올리기를 누른 뒤에 알린다. 서버도 같은 규칙으로 확인한다.
  const titleLength = charLength(fields.title);
  const subtitleLength = charLength(fields.subtitle);
  const topicNames = parseTopicInput(fields.tags);
  const badImages = findUnfetchableImages(fields.text);
  const errors = {
    title:
      titleLength > LIMIT
        ? `${LIMIT}자를 넘었습니다. ${LIMIT}자 안으로 줄여야 저장됩니다.`
        : tried && !fields.title.trim()
          ? "제목을 적어 주세요."
          : "",
    subtitle: subtitleLength > LIMIT ? `${LIMIT}자를 넘었습니다. ${LIMIT}자 안으로 줄여야 저장됩니다.` : "",
    tags: topicNames.some((t) => charLength(t) > LIMIT) ? `주제 하나는 ${LIMIT}자까지입니다.` : "",
    text: badImages.length
      ? `이미지 주소는 http:// 나 https:// 로 시작해야 서버가 내려받습니다. 고칠 주소: ${badImages.slice(0, 2).join(", ")}`
      : tried && !fields.text.trim()
        ? "본문을 적어 주세요."
        : "",
  };
  const blocking =
    !fields.title.trim() ||
    !fields.text.trim() ||
    titleLength > LIMIT ||
    subtitleLength > LIMIT ||
    errors.tags ||
    badImages.length > 0;

  const dirty = isNew
    ? !isEmptyDraft(fields) || images.length > 0
    : JSON.stringify(fields) !== JSON.stringify(baseline) || thumb !== "keep";

  // 새 글은 쓰는 동안 이 브라우저에 임시 저장한다.
  const lastSaved = useRef(restored ? JSON.stringify(start.fields) : "");
  useEffect(() => {
    if (!isNew) return undefined;
    const timer = window.setTimeout(() => {
      if (leaving.current) return;
      if (isEmptyDraft(fields)) {
        clearDraft();
        lastSaved.current = "";
        setSavedAt(null);
        return;
      }
      const snapshot = JSON.stringify(fields);
      if (snapshot === lastSaved.current) return;
      const at = saveDraft(fields);
      if (at) {
        lastSaved.current = snapshot;
        setSavedAt(at);
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [fields, isNew]);

  // 저장하지 않고 떠나려 하면 묻는다. 화면 안 이동은 대화상자로, 탭 닫기·새로고침은 브라우저 확인창으로.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname
  );
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      if (leaving.current) return;
      if (isNew && !isEmptyDraft(fieldsRef.current)) saveDraft(fieldsRef.current);
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, isNew]);

  useEffect(() => {
    document.documentElement.classList.add("has-action-bar");
    return () => {
      document.documentElement.classList.remove("has-action-bar");
      for (const img of imagesRef.current) URL.revokeObjectURL(img.url);
    };
  }, []);

  const addImages = (fileList) => {
    const added = [...fileList]
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => {
        imageSeq += 1;
        return { key: `img-${imageSeq}`, file, url: URL.createObjectURL(file) };
      });
    if (!added.length) return;
    setImages((list) => [...list, ...added]);
    // 새 글에서 아직 고른 것이 없으면 처음 넣은 이미지를 고른 상태로 둔다. 바꾸는 건 자유다.
    setThumb((current) => (current === null ? added[0].key : current));
  };

  const removeImage = (key) => {
    const target = images.find((img) => img.key === key);
    if (target) URL.revokeObjectURL(target.url);
    const rest = images.filter((img) => img.key !== key);
    setImages(rest);
    if (thumb === key) setThumb(isNew ? (rest[0] ? rest[0].key : null) : "keep");
  };

  const discardDraft = () => {
    clearDraft();
    lastSaved.current = "";
    setFields(EMPTY);
    setSavedAt(null);
    setShowRestored(false);
  };

  const focusFirstProblem = () => {
    const order = [
      ["title", !fields.title.trim() || titleLength > LIMIT],
      ["subtitle", subtitleLength > LIMIT],
      ["tags", Boolean(errors.tags)],
      ["text", !fields.text.trim() || badImages.length > 0],
    ];
    const first = order.find(([, bad]) => bad);
    if (!first) return;
    setMode("write");
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`f-${first[0]}`);
      if (el) el.focus();
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setTried(true);
    setSubmitError("");
    if (blocking) {
      focusFirstProblem();
      return;
    }
    const payload = {
      title: fields.title.trim(),
      subtitle: fields.subtitle.trim(),
      tags: topicNames,
      text: fields.text,
    };
    const chosen = images.find((img) => img.key === thumb);
    const file = chosen ? chosen.file : null;

    setSaving(true);
    try {
      if (isNew) {
        const id = await createPost(payload, file);
        const saved = await getPost(id, { fresh: true });
        if (!saved || saved.title !== payload.title) throw new NotConfirmed();
        clearDraft();
        leaving.current = true;
        navigate("/admin", { state: { message: `‘${payload.title}’ 글을 올렸습니다.` } });
      } else {
        await updatePost(post.id, payload, file);
        const fresh = await getPost(post.id, { fresh: true });
        if (!fresh || fresh.title !== payload.title || fresh.subtitle !== payload.subtitle) throw new NotConfirmed();
        leaving.current = true;
        navigate("/admin", { state: { message: `‘${payload.title}’ 글의 수정 내용을 저장했습니다.` } });
      }
    } catch (error) {
      setSubmitError(
        error instanceof NotConfirmed
          ? "저장했다는 응답을 받았지만 다시 읽어 보니 글이 바뀌지 않았습니다. 잠시 뒤 목록에서 확인해 주세요."
          : error && error.status === 401
            ? "로그인한 지 오래되어 저장하지 못했습니다. 새 탭에서 관리 화면에 다시 로그인한 뒤, 이 화면에서 다시 저장하세요."
            : `저장하지 못했습니다. ${error.message}`
      );
    } finally {
      setSaving(false);
    }
  };

  const leaveAnyway = () => {
    if (isNew && !isEmptyDraft(fieldsRef.current)) saveDraft(fieldsRef.current);
    blocker.proceed();
  };

  // 미리보기는 글 화면과 같은 머리·렌더러로 그린다. 긴 글을 칠 때 입력이 밀리지 않게 한 박자 늦춘다.
  const previewText = useDeferredValue(fields.text);
  const chosen = images.find((img) => img.key === thumb);
  const previewPost = {
    title: fields.title,
    subtitle: fields.subtitle,
    date: post ? post.date || todayISO() : todayISO(),
    topics: topicsOf(topicNames),
  };
  const coverSrc = chosen ? chosen.url : !isNew && thumb === "keep" ? thumbnailUrl(post) : null;

  return (
    <form className="editor" onSubmit={submit} noValidate>
      <div className="page-head on-field">
        <div className="wrap page-head__inner page-head__row">
          <h1 className="page-head__title">{isNew ? "새 글 쓰기" : "글 수정"}</h1>
          <div className="segmented" role="group" aria-label="보기 전환">
            <button type="button" aria-pressed={mode === "write"} onClick={() => setMode("write")}>
              쓰기
            </button>
            <button type="button" aria-pressed={mode === "preview"} onClick={() => setMode("preview")}>
              미리보기
            </button>
          </div>
        </div>
      </div>

      <div className="wrap editor__body">
        {showRestored && (
          <div className="notice">
            <span>{formatClock(restored.savedAt)}에 임시 저장한 글을 불러왔습니다.</span>
            <button type="button" className="button button--quiet" onClick={discardDraft}>
              지우고 새로 쓰기
            </button>
          </div>
        )}

        <div className="editor__panes" data-mode={mode}>
          <section className="editor__write" aria-label="쓰기">
            <div className="field">
              <div className="field__row">
                <label className="field__label" htmlFor="f-title">
                  제목 <span className="field__required">필수</span>
                </label>
                <Counter id="f-title-count" length={titleLength} />
              </div>
              <input
                id="f-title"
                className="input"
                value={fields.title}
                onChange={update("title")}
                autoComplete="off"
                aria-required="true"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={`f-title-count${errors.title ? " f-title-error" : ""}`}
              />
              {errors.title && (
                <p id="f-title-error" className="field__error" role="alert">
                  {errors.title}
                </p>
              )}
            </div>

            <div className="field">
              <div className="field__row">
                <label className="field__label" htmlFor="f-subtitle">
                  부제
                </label>
                <Counter id="f-subtitle-count" length={subtitleLength} />
              </div>
              <input
                id="f-subtitle"
                className="input"
                value={fields.subtitle}
                onChange={update("subtitle")}
                autoComplete="off"
                aria-invalid={Boolean(errors.subtitle)}
                aria-describedby={`f-subtitle-count${errors.subtitle ? " f-subtitle-error" : ""}`}
              />
              {errors.subtitle && (
                <p id="f-subtitle-error" className="field__error" role="alert">
                  {errors.subtitle}
                </p>
              )}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="f-tags">
                주제
              </label>
              <input
                id="f-tags"
                className="input"
                value={fields.tags}
                onChange={update("tags")}
                autoComplete="off"
                placeholder="istio, kubernetes"
                aria-invalid={Boolean(errors.tags)}
                aria-describedby={`f-tags-help${errors.tags ? " f-tags-error" : ""}`}
              />
              <p id="f-tags-help" className="field__help">
                쉼표로 나눠 적습니다.
                {topicNames.length > 0 && ` 주제 ${topicNames.length}개: ${topicsOf(topicNames).join(", ")}`}
              </p>
              {errors.tags && (
                <p id="f-tags-error" className="field__error" role="alert">
                  {errors.tags}
                </p>
              )}
            </div>

            <ThumbnailPicker
              isNew={isNew}
              current={post ? thumbnailUrl(post) : null}
              images={images}
              value={thumb}
              onPick={setThumb}
              onAdd={addImages}
              onRemove={removeImage}
            />

            <div className="field">
              <label className="field__label" htmlFor="f-text">
                본문 <span className="field__required">필수</span>
              </label>
              <p id="f-text-help" className="field__help">
                마크다운으로 씁니다. 이미지는 ![설명](https://…) 처럼 주소로 넣으면 저장할 때 서버가 내려받아
                보관합니다.
              </p>
              <textarea
                id="f-text"
                className="textarea editor__text"
                value={fields.text}
                onChange={update("text")}
                spellCheck={false}
                aria-required="true"
                aria-invalid={Boolean(errors.text)}
                aria-describedby={`f-text-help${errors.text ? " f-text-error" : ""}`}
              />
              {errors.text && (
                <p id="f-text-error" className="field__error" role="alert">
                  {errors.text}
                </p>
              )}
            </div>
          </section>

          <section className="editor__preview" aria-label="미리보기">
            <p className="editor__pane-label">미리보기</p>
            <div className="preview">
              <div className="preview__head on-field">
                <PostHeader post={previewPost} titleAs="h2" linkTopics={false} minutes={readingMinutes(previewText)} />
              </div>
              <div className="preview__body">
                <PostCover key={coverSrc || "none"} src={coverSrc} />
                {previewText.trim() ? (
                  <Prose source={previewText} headingBase={3} />
                ) : (
                  <p className="editor__empty">본문을 쓰면 글 화면과 같은 모양으로 여기에 보입니다.</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="editor__actions">
          <p className="editor__saved">
            {isNew && savedAt ? `${formatClock(savedAt)}에 이 브라우저에 임시 저장했습니다.` : ""}
          </p>
          {submitError && (
            <p className="notice editor__error" data-tone="danger" role="alert">
              {submitError}
            </p>
          )}
          <div className="editor__buttons">
            <Link to="/admin" className="button button--quiet">
              목록으로
            </Link>
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? (isNew ? "올리는 중" : "저장하는 중") : isNew ? "글 올리기" : "수정 저장"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        title="저장하지 않고 나갈까요?"
        confirmLabel="나가기"
        cancelLabel="계속 쓰기"
        onConfirm={leaveAnyway}
        onCancel={() => blocker.reset && blocker.reset()}
      >
        {isNew ? (
          <p>
            쓰던 글은 이 브라우저에 임시 저장되어 있어 다시 열면 이어 쓸 수 있습니다. 고른 이미지는 다시 골라야 합니다.
          </p>
        ) : (
          <p>고친 내용은 저장되지 않고 사라집니다.</p>
        )}
      </ConfirmDialog>
    </form>
  );
}
