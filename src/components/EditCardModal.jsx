import React, { useEffect, useMemo, useRef, useState } from "react";

console.log("✅ EditCardModal.jsx loaded");

export default function EditCardModal({ open, card, onSave, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const firstInputRef = useRef(null);

  const headerTitle = useMemo(() => {
    const teamNumber = card?.meta?.teamNumber;
    const nickname = card?.meta?.nickname;
    if (teamNumber) {
      return `Edit Team ${teamNumber}${nickname ? ` — ${nickname}` : ""}`;
    }
    return "Edit Card";
  }, [card]);

  useEffect(() => {
    if (!open) return;

    setTitle(card?.title || "");
    setDescription(card?.description || "");

    // focus after render
    setTimeout(() => {
      try {
        firstInputRef.current?.focus();
      } catch {}
    }, 0);

    console.log("📝 Edit modal opened for card:", card?.id);
  }, [open, card]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        console.log("⎋ Escape pressed — closing modal");
        onClose?.();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") {
        console.log("⌘/Ctrl+Enter — saving modal");
        doSave();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title, description, card]);

  const doSave = () => {
    if (!card?.id) return;

    const nextTitle = String(title || "").trim();
    const nextDesc = String(description || "").trim();

    if (!nextTitle) {
      console.log("⚠️ Save blocked — title empty");
      return;
    }

    console.log("✅ Saving card edits:", { id: card.id, title: nextTitle });
    onSave?.(card.id, { title: nextTitle, description: nextDesc });
  };

  if (!open) return null;

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="modalPanel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <div className="modalTitle">{headerTitle}</div>
            <div className="modalSubtitle">Esc to close • Ctrl/⌘+Enter to save</div>
          </div>

          <button className="iconBtn" onClick={onClose} title="Close">
            ✖️
          </button>
        </div>

        <div className="modalBody">
          <label className="modalLabel">Title</label>
          <input
            ref={firstInputRef}
            className="modalInput"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Card title..."
          />

          <label className="modalLabel">Notes</label>
          <textarea
            className="modalTextarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Type notes here..."
            rows={6}
          />

          <div className="modalActions">
            <button className="btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn" onClick={doSave} disabled={!String(title || "").trim()}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
