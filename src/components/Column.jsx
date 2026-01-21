import React from "react";
import { useDroppable } from "@dnd-kit/core";
import Card from "./Card.jsx";

export default function Column({
  column,
  cards,
  editingCardId,
  onAddCard,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteCard,
  onRenameColumn,
  onDeleteColumn,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <section className={`column ${isOver ? "over" : ""}`} ref={setNodeRef}>
      <div className="columnHeader">
        <div className="columnTitleWrap">
          <div className="columnTitle">{column.title}</div>
          <div className="pill">{cards.length}</div>
        </div>

        <div className="columnBtns">
          <button className="iconBtn" title="Rename column" onClick={onRenameColumn}>
            ✏️
          </button>
          <button className="iconBtn danger" title="Delete column" onClick={onDeleteColumn}>
            🗑️
          </button>
        </div>
      </div>

      <div className="columnBody">
        <button className="addCard" onClick={onAddCard}>+ Add card</button>

        <div className="cardList">
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              isEditing={editingCardId === card.id}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
              onDelete={onDeleteCard}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
