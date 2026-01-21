import React, { useEffect } from "react";

console.log("✅ Modal.jsx loaded");

export default function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") {
        console.log("⎋ Escape pressed — closing modal");
        onClose?.();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modalBackdrop"
      onMouseDown={(e) => {
        // click outside closes
        if (e.target === e.currentTarget) {
          console.log("🟪 Backdrop click — closing modal");
          onClose?.();
        }
      }}
    >
      <div className="modalPanel" role="dialog" aria-modal="true" aria-label={title || "Modal"}>
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button className="modalClose" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}
