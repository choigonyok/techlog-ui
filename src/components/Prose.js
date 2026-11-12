import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { codeLanguage, isImageOnly, rehypeHeadings, rehypeYoutube } from "../lib/markdownTree";
import Icon from "./Icon";
import { rehypeCode } from "./highlight";
import "./Prose.css";

const HIDDEN_LANGS = new Set(["other", "text", "txt", "plain", "plaintext"]);

function CodeBlock({ node, children, ...rest }) {
  const preRef = useRef(null);
  const [status, setStatus] = useState("");
  const code = node && node.children && node.children[0];
  const lang = codeLanguage(code);

  const copy = async () => {
    const text = preRef.current ? preRef.current.innerText.replace(/\n$/, "") : "";
    try {
      await navigator.clipboard.writeText(text);
      setStatus("복사했습니다");
    } catch {
      setStatus("복사하지 못했습니다");
    }
    window.setTimeout(() => setStatus(""), 1800);
  };

  return (
    <div className="code">
      <div className="code__bar">
        <span className="code__lang">{lang && !HIDDEN_LANGS.has(lang) ? lang : ""}</span>
        <button type="button" className="code__copy" onClick={copy}>
          <Icon name={status === "복사했습니다" ? "check" : "copy"} size={16} />
          {status || "복사"}
        </button>
        <span className="sr-only" role="status" aria-live="polite">
          {status}
        </span>
      </div>
      {/* 가로로 넘치는 코드를 키보드로도 밀 수 있게 포커스를 받는다. */}
      <pre ref={preRef} tabIndex={0} {...rest}>
        {children}
      </pre>
    </div>
  );
}

// 그림을 누르면 크게 본다. 본문 폭에 맞춰 줄어든 화면 갈무리(콘솔·구성도)의 글자를 읽을 수 있다.
const ZoomContext = createContext(null);

// 옛 글에는 원래 주소가 사라진 그림이 있다(들여올 때 /api/images/missing-… 으로 바뀐다).
// 깨진 그림 아이콘 대신 그 자리에 무엇이 없는지 적는다.
function ProseImage({ node, alt, src, ...rest }) {
  const [failed, setFailed] = useState(false);
  const zoom = useContext(ZoomContext);
  if (failed || /\/api\/images\/missing-/.test(src || "")) {
    return (
      <span className="img-missing" role="img" aria-label={alt ? `불러오지 못한 그림: ${alt}` : "불러오지 못한 그림"}>
        그림을 불러오지 못했습니다
      </span>
    );
  }
  const image = (
    <img {...rest} src={src} alt={alt || ""} loading="lazy" decoding="async" onError={() => setFailed(true)} />
  );
  if (!zoom) return image;
  return (
    <button
      type="button"
      className="zoom"
      onClick={() => zoom({ src, alt: alt || "" })}
      aria-label={alt ? `그림 크게 보기: ${alt}` : "그림 크게 보기"}
    >
      {image}
    </button>
  );
}

// 크게 본 그림. 처음에는 화면에 맞춘다. 그렇게 하면 절반보다 작아지는 그림(폰에서 본 넓은 갈무리)은
// 실제 크기로 열어 밀어 가며 본다. 그림을 누르거나 단추로 두 보기를 오간다.
function LightboxView({ image, onClose }) {
  const stageRef = useRef(null);
  const [view, setView] = useState({ canZoom: false, full: false });

  const onLoad = (event) => {
    const img = event.currentTarget;
    const stage = stageRef.current;
    if (!stage || !img.naturalWidth) return;
    // 무대의 안쪽 여백(위아래·좌우 12px 남짓)을 뺀 자리에 맞출 때의 배율
    const fit = Math.min((stage.clientWidth - 24) / img.naturalWidth, (stage.clientHeight - 28) / img.naturalHeight);
    setView({ canZoom: fit < 1, full: fit < 0.5 });
  };
  const toggle = () => setView((v) => (v.canZoom ? { ...v, full: !v.full } : v));

  return (
    <>
      <div className="lightbox__bar">
        {view.canZoom && (
          <button type="button" className="lightbox__link" onClick={toggle}>
            {view.full ? "화면에 맞추기" : "실제 크기로 보기"}
          </button>
        )}
        <a className="lightbox__link" href={image.src} target="_blank" rel="noreferrer">
          원본 열기
        </a>
        <button type="button" className="icon-button lightbox__close" onClick={onClose} aria-label="닫기">
          <Icon name="close" />
        </button>
      </div>
      <div ref={stageRef} className="lightbox__stage" data-full={view.full}>
        {/* 키보드로는 위의 단추로 같은 일을 한다. */}
        <img
          className="lightbox__img"
          src={image.src}
          alt={image.alt}
          data-zoomable={view.canZoom}
          onLoad={onLoad}
          onClick={toggle}
        />
      </div>
    </>
  );
}

function Lightbox({ image, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (image && !dialog.open && typeof dialog.showModal === "function") dialog.showModal();
    else if (!image && dialog.open) dialog.close();
  }, [image]);

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label="크게 본 그림"
      onClose={onClose}
      // 그림 바깥(어두운 바탕)을 누르면 닫는다.
      onClick={(event) => {
        if (event.target === event.currentTarget || event.target.classList.contains("lightbox__stage")) onClose();
      }}
    >
      {image && <LightboxView key={image.src} image={image} onClose={onClose} />}
    </dialog>
  );
}

// 링크에 싸인 그림은 눌렀을 때 링크를 따라가야 하므로 크게 보기를 붙이지 않는다.
function ProseLink({ node, children, ...rest }) {
  return (
    <ZoomContext.Provider value={null}>
      <a {...rest}>{children}</a>
    </ZoomContext.Provider>
  );
}

// 그림만 있는 문단은 본문보다 넓게 놓을 수 있는 그림 틀로 바꾼다.
function Paragraph({ node, children, ...rest }) {
  if (isImageOnly(node)) return <figure className="figure">{children}</figure>;
  return <p {...rest}>{children}</p>;
}

function ProseTable({ node, ...rest }) {
  return (
    <div className="table-scroll" tabIndex={0}>
      <table {...rest} />
    </div>
  );
}

const components = { pre: CodeBlock, img: ProseImage, a: ProseLink, p: Paragraph, table: ProseTable };
const remarkPlugins = [remarkGfm];

// 글 화면과 관리 화면 미리보기가 같은 렌더러를 쓴다. headingBase 는 본문에서 가장 큰 제목의 단계다.
export default function Prose({ source, headingBase = 2 }) {
  const rehypePlugins = useMemo(
    () => [rehypeYoutube, [rehypeHeadings, { base: headingBase }], rehypeCode],
    [headingBase]
  );
  const [zoomed, setZoomed] = useState(null);
  // 그림을 크게 볼 때마다 본문을 다시 풀어 읽지 않도록 그려 둔 본문을 쥐고 있는다.
  const body = useMemo(
    () => (
      <Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {source || ""}
      </Markdown>
    ),
    [source, rehypePlugins]
  );
  return (
    <>
      <div className="prose">
        <ZoomContext.Provider value={setZoomed}>{body}</ZoomContext.Provider>
      </div>
      <Lightbox image={zoomed} onClose={() => setZoomed(null)} />
    </>
  );
}
