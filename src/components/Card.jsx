import React, { useEffect, useMemo, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function Card({
  card,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}) {
  const isTemp = !!card?.meta?.temp;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    disabled: isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  const teamNumber = card?.meta?.teamNumber;
  const nickname = card?.meta?.nickname;

  const displayTitle = useMemo(() => {
    if (teamNumber) return `Team ${teamNumber}${nickname ? ` — ${nickname}` : ""}`;
    return card?.title || "";
  }, [teamNumber, nickname, card?.title]);

  const a = card?.meta?.analytics;

  const [title, setTitle] = useState(card?.title || "");
  const [description, setDescription] = useState(card?.description || "");

  useEffect(() => {
    if (!isEditing) return;
    setTitle(card?.title || "");
    setDescription(card?.description || "");
    console.log(`📝 Editing card (inline): ${card?.id}`);
  }, [isEditing, card?.id, card?.title, card?.description]);

  useEffect(() => {
    if (isTemp && !isEditing) {
      console.log(`🆕 Temp card detected, requesting edit start: ${card.id}`);
      onStartEdit?.(card.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTemp]);

  const canSave = String(title || "").trim().length > 0;

  const handleSave = () => {
    if (!canSave) {
      console.log("⚠️ Save blocked — title is empty");
      return;
    }
    console.log("✅ Saving inline edit:", { id: card.id, title });
    onSaveEdit?.(card.id, { title: title.trim(), description: String(description || "") }, isTemp);
  };

  const handleCancel = () => {
    console.log("❎ Cancel inline edit:", { id: card.id, isTemp });
    onCancelEdit?.(card.id, isTemp);
  };

  const wlText =
    a?.wl && a.wl.wins != null ? `${a.wl.wins}-${a.wl.losses}-${a.wl.ties}` : null;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`card ${isEditing ? "editing" : ""}`}
      {...attributes}
    >
      <div className="cardTop">
        <div
          className={`grab ${isEditing ? "disabled" : ""}`}
          title={isEditing ? "Drag disabled while editing" : "Drag"}
          {...(!isEditing ? listeners : {})}
        >
          ⠿
        </div>

        <div className="cardTitle">
          {isEditing ? <span className="mutedLabel">{isTemp ? "New Card" : "Editing"}</span> : displayTitle}
        </div>
      </div>

      {!isEditing ? (
        <>
          {card?.description ? <div className="cardDesc">{card.description}</div> : null}

          {/* ✅ Analytics badges */}
          {a ? (
            <>
              <div className="badges">
                {a.rank != null && <span className="badge">Rank {a.rank}</span>}
                {wlText && <span className="badge">{wlText}</span>}
                {a.epa != null && <span className="badge">EPA {Number(a.epa).toFixed(1)}</span>}
                <span className="badge">Fuel {Number(a.avgFuel || 0).toFixed(1)}</span>
                <span className="badge">Hang {Number(a.avgHang || 0).toFixed(1)}</span>
              </div>

              {Array.isArray(a.recent) && a.recent.length > 0 ? (
                <div className="recentRow">
                  {a.recent.map((m) => (
                    <span key={m.matchKey} className={`recent ${m.wl}`}>
                      {m.wl} {m.score}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          <div className="cardBtns">
            <button className="chipBtn" onClick={() => onStartEdit?.(card.id)}>
              Edit
            </button>
            <button className="chipBtn danger" onClick={() => onDelete?.(card.id)}>
              Delete
            </button>
          </div>
        </>
      ) : (
        <div className="cardEditWrap">
          <label className="cardEditLabel">Title</label>
          <input
            className="cardEditInput"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={teamNumber ? `Team ${teamNumber}` : "Card title..."}
            autoFocus
          />

          <label className="cardEditLabel">Notes</label>
          <textarea
            className="cardEditTextarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Type notes here..."
            rows={5}
          />

          <div className="cardEditActions">
            <button className="btn secondary" type="button" onClick={handleCancel}>
              Cancel
            </button>
            <button className="btn" type="button" onClick={handleSave} disabled={!canSave}>
              Save
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
