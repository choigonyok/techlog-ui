import { useEffect, useId, useRef } from "react";
import "./ConfirmDialog.css";

// 브라우저 기본 <dialog> 로 띄운다. 포커스가 대화상자 안에 갇히고 Esc 로 닫히며,
// 처음 포커스는 되돌릴 수 있는 쪽(취소)에 둔다.
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "취소",
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);
  const cancelRef = useRef(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      if (cancelRef.current) cancelRef.current.focus();
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-body`}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id={`${id}-title`} className="dialog__title">
        {title}
      </h2>
      <div id={`${id}-body`} className="dialog__body">
        {children}
      </div>
      <div className="dialog__actions">
        <button ref={cancelRef} type="button" className="button" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`button ${tone === "danger" ? "button--danger" : "button--primary"}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
