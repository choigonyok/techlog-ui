import { useRef, useState } from "react";
function CurrentThumb({ src }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className="thumb__empty">썸네일 없음</span>;
  return <img className="thumb__img" src={src} alt="" onError={() => setFailed(true)} />;
}

// 썸네일로 쓸 이미지를 직접 고른다. 고른 이미지 한 장만 서버로 올라간다.
// 라디오 단추라 키보드(화살표)와 화면 낭독기로도 고를 수 있다.
export default function ThumbnailPicker({ isNew, current, images, value, onPick, onAdd, onRemove }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer && event.dataTransfer.files.length) onAdd(event.dataTransfer.files);
  };

  return (
    <fieldset
      className="thumbs"
      data-dragging={dragging}
      aria-describedby="thumb-help"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <legend className="field__label">썸네일</legend>
      <p id="thumb-help" className="field__help">
        글 머리에 쓸 이미지를 고릅니다. 고른 한 장만 올라가며, 이미지를 이 칸에 끌어 놓아도 됩니다.
      </p>
      <div className="thumbs__grid">
        {!isNew && (
          <label className={`thumb${value === "keep" ? " is-selected" : ""}`}>
            <input
              className="thumb__radio"
              type="radio"
              name="thumbnail"
              value="keep"
              checked={value === "keep"}
              onChange={() => onPick("keep")}
            />
            <CurrentThumb src={current} />
            <span className="thumb__name">지금 썸네일 유지</span>
          </label>
        )}
        {images.map((img) => (
          <div key={img.key} className="thumb-wrap">
            <label className={`thumb${value === img.key ? " is-selected" : ""}`}>
              <input
                className="thumb__radio"
                type="radio"
                name="thumbnail"
                value={img.key}
                checked={value === img.key}
                onChange={() => onPick(img.key)}
              />
              <img className="thumb__img" src={img.url} alt="" />
              <span className="thumb__name" title={img.file.name}>
                {img.file.name}
              </span>
            </label>
            <button
              type="button"
              className="thumb__remove"
              onClick={() => onRemove(img.key)}
              aria-label={`${img.file.name} 빼기`}
            >
              빼기
            </button>
          </div>
        ))}
        <button type="button" className="thumb thumb--add" onClick={() => inputRef.current && inputRef.current.click()}>
          이미지 추가
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files && event.target.files.length) onAdd(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {isNew && images.length === 0 && <p className="field__help">이미지를 고르지 않으면 썸네일 없이 올라갑니다.</p>}
      {!isNew && images.length > 0 && value === "keep" && (
        <p className="field__help">추가한 이미지를 썸네일로 쓰려면 그 이미지를 고르세요.</p>
      )}
    </fieldset>
  );
}
