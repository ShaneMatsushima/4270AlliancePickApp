import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import Column from "./components/Column.jsx";
import CardOverlay from "./components/CardOverlay.jsx";

import {
  loadBoard,
  saveBoard,
  createCard,
  moveCardAcrossColumns,
  findCardById,
  updateCard,
  deleteCard,
  addColumn,
  deleteColumn,
  renameColumn,
} from "./utils/boardStore.js";

import { fetchEventTeamsSimple, normalizeEventKey } from "./utils/tba.js";

console.log("✅ App.jsx loaded (inline edit mode)");

const DEFAULT_COLUMNS = [
  { id: "unsorted", title: "Unsorted" },
  { id: "firstPick", title: "First Pick" },
  { id: "secondPick", title: "Second Pick" },
  { id: "thirdPick", title: "Third Pick" },
  { id: "doNotPick", title: "Do Not Pick" },
];

const DEFAULT_CARDS = {
  unsorted: [],
  firstPick: [],
  secondPick: [],
  thirdPick: [],
  doNotPick: [],
};

export default function App() {
  // ----------------- State -----------------
  const [board, setBoard] = useState(() => {
    const loaded = loadBoard();
    if (loaded) {
      console.log("📦 Loaded board from localStorage");
      return loaded;
    }
    console.log("🆕 Using default board");
    return { columns: DEFAULT_COLUMNS, cardsByColumn: DEFAULT_CARDS };
  });

  const [activeCardId, setActiveCardId] = useState(null);

  // Inline editing
  const [editingCardId, setEditingCardId] = useState(null);

  // TBA import UI
  const [compCode, setCompCode] = useState("HIHO");
  const [importStatus, setImportStatus] = useState("");
  const [importing, setImporting] = useState(false);

  // ----------------- DnD Sensors -----------------
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  // ----------------- Derived -----------------
  const columnIds = useMemo(() => board.columns.map((c) => c.id), [board.columns]);

  const allCardsFlat = useMemo(() => {
    const out = [];
    for (const col of board.columns) {
      const cards = board.cardsByColumn[col.id] || [];
      for (const card of cards) out.push({ ...card, columnId: col.id });
    }
    return out;
  }, [board]);

  const activeCard = useMemo(() => {
    if (!activeCardId) return null;
    const found = findCardById(board, activeCardId);
    return found ? { ...found.card, columnId: found.columnId } : null;
  }, [activeCardId, board]);

  // ----------------- Persistence -----------------
  const saveTimer = useRef(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveBoard(board);
      console.log("💾 Board saved to localStorage");
    }, 150);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [board]);

  // ----------------- Card Actions -----------------
  const onAddCard = (columnId) => {
    console.log(`➕ Add card (inline) requested for column "${columnId}"`);

    const newCard = createCard({
      title: "",
      description: "",
      meta: { temp: true }, // marks as "new draft"
    });

    setBoard((prev) => {
      const next = structuredClone(prev);
      next.cardsByColumn[columnId] = next.cardsByColumn[columnId] || [];
      next.cardsByColumn[columnId].unshift(newCard);
      return next;
    });

    // open inline edit for the newly created card
    setEditingCardId(newCard.id);
  };

  const onStartEdit = (cardId) => {
    console.log("📝 Start inline edit:", cardId);
    setEditingCardId(cardId);
  };

  const onCancelEdit = (cardId, isTemp) => {
    console.log("❎ Cancel inline edit:", { cardId, isTemp });
    if (isTemp) {
      // If it's a new unsaved card, delete it
      setBoard((prev) => deleteCard(prev, cardId));
    }
    setEditingCardId(null);
  };

  const onSaveEdit = (cardId, patch, isTemp) => {
    console.log("✅ Save inline edit:", { cardId, patch, isTemp });

    // Clear temp flag if it was new
    setBoard((prev) =>
      updateCard(prev, cardId, {
        ...patch,
        meta: {
          ...(findCardById(prev, cardId)?.card?.meta || {}),
          ...(patch.meta || {}),
          temp: false,
        },
      })
    );

    setEditingCardId(null);
  };

  const onDeleteCard = (cardId) => {
    if (!confirm("Delete this card?")) return;
    console.log(`🗑️ Deleting card ${cardId}`);
    if (editingCardId === cardId) setEditingCardId(null);
    setBoard((prev) => deleteCard(prev, cardId));
  };

  // ----------------- Column Actions -----------------
  const onAddColumn = () => {
    const title = prompt("Column name?");
    if (!title) return;
    console.log(`🧱 Adding column "${title}"`);
    setBoard((prev) => addColumn(prev, title));
  };

  const onRenameColumn = (columnId) => {
    const col = board.columns.find((c) => c.id === columnId);
    if (!col) return;
    const title = prompt("New column name:", col.title);
    if (!title) return;
    console.log(`🏷️ Renaming column "${columnId}" -> "${title}"`);
    setBoard((prev) => renameColumn(prev, columnId, title));
  };

  const onDeleteColumn = (columnId) => {
    if (!confirm("Delete this column and all its cards?")) return;
    console.log(`🧨 Deleting column "${columnId}"`);
    setBoard((prev) => deleteColumn(prev, columnId));
  };

  const onReset = () => {
    if (!confirm("Reset board to defaults?")) return;
    console.log("🔄 Resetting board");
    const next = { columns: DEFAULT_COLUMNS, cardsByColumn: DEFAULT_CARDS };
    setEditingCardId(null);
    setBoard(structuredClone(next));
  };

  // ----------------- TBA Import -----------------
  const importTeamsFromTBA = async () => {
    const eventKey = normalizeEventKey(compCode);
    if (!eventKey) return;

    console.log(`🏟️ Import requested. Input="${compCode}" -> eventKey="${eventKey}"`);
    setImporting(true);
    setImportStatus(`Loading teams for ${eventKey}...`);

    try {
      const teams = await fetchEventTeamsSimple(eventKey);

      // avoid duplicates by tbaTeamKey across all columns
      const existingKeys = new Set();
      for (const col of board.columns) {
        const cards = board.cardsByColumn[col.id] || [];
        for (const c of cards) {
          if (c?.meta?.tbaTeamKey) existingKeys.add(c.meta.tbaTeamKey);
        }
      }

      const newCards = [];
      for (const t of teams) {
        const teamKey = t.key; // "frc4270"
        if (existingKeys.has(teamKey)) continue;

        const teamNumber = t.team_number;
        const nickname = t.nickname || t.name || "";
        const id = `tba_${eventKey}_${teamKey}`;

        newCards.push(
          createCard({
            id,
            title: `Team ${teamNumber}`,
            description: "",
            meta: {
              source: "tba",
              eventKey,
              tbaTeamKey: teamKey,
              teamNumber,
              nickname,
              city: t.city || "",
              stateProv: t.state_prov || "",
              country: t.country || "",
            },
          })
        );
      }

      console.log(`✅ Import complete. New cards added: ${newCards.length}`);
      setImportStatus(`Loaded ${teams.length} teams. Added ${newCards.length} new cards to Unsorted.`);

      setBoard((prev) => {
        const next = structuredClone(prev);
        next.cardsByColumn.unsorted = next.cardsByColumn.unsorted || [];
        next.cardsByColumn.unsorted = [...newCards, ...next.cardsByColumn.unsorted];
        return next;
      });
    } catch (e) {
      console.log("❌ Import failed:", e);
      setImportStatus(`Error: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  // ----------------- DnD Helpers -----------------
  const getColumnIdForDroppable = (id) => {
    if (columnIds.includes(id)) return id;
    const found = findCardById(board, id);
    if (found) return found.columnId;
    return null;
  };

  // ----------------- DnD Events -----------------
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveCardId(active.id);
    console.log("🟦 Drag start:", active.id);
  };

  const handleDragCancel = () => {
    console.log("🟥 Drag cancel");
    setActiveCardId(null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over) {
      console.log("⬜ Drag end: no drop target");
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) {
      console.log("✅ Dropped on itself:", activeId);
      return;
    }

    const fromCol = getColumnIdForDroppable(activeId);
    const toCol = getColumnIdForDroppable(overId);

    if (!fromCol || !toCol) {
      console.log("⚠️ Could not resolve columns for drag end", { fromCol, toCol });
      return;
    }

    if (fromCol === toCol) {
      const cards = board.cardsByColumn[fromCol] || [];
      const oldIndex = cards.findIndex((c) => c.id === activeId);
      const newIndex = cards.findIndex((c) => c.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      console.log(`↕️ Reordering within "${fromCol}": ${oldIndex} -> ${newIndex}`);

      setBoard((prev) => {
        const next = structuredClone(prev);
        next.cardsByColumn[fromCol] = arrayMove(next.cardsByColumn[fromCol], oldIndex, newIndex);
        return next;
      });
      return;
    }

    console.log(`➡️ Moving card ${activeId} from "${fromCol}" to "${toCol}" (over ${overId})`);
    setBoard((prev) => moveCardAcrossColumns(prev, activeId, fromCol, toCol, overId));
  };

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="brand">
          <div className="logoDot" />
          <div>
            <div className="title">4270 Alliance Board</div>
            <div className="subtitle">Drag cards between columns</div>
          </div>
        </div>

        <div className="actions">
          <button className="btn" onClick={onAddColumn}>+ Column</button>
          <button className="btn secondary" onClick={onReset}>Reset</button>
        </div>
      </header>

      {/* 🔌 TBA Import Bar */}
      <div style={{ padding: "0 18px 10px", display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
            Competition code (e.g. HIHO) or full event key (e.g. 2026hiho)
          </div>
          <input
            value={compCode}
            onChange={(e) => setCompCode(e.target.value)}
            placeholder="HIHO"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              outline: "none",
            }}
          />
        </div>

        <button
          className="btn"
          onClick={importTeamsFromTBA}
          disabled={importing}
          style={{ whiteSpace: "nowrap" }}
        >
          {importing ? "Loading..." : "Load Teams"}
        </button>

        <div style={{ fontSize: 12, opacity: 0.75, maxWidth: 520 }}>
          {importStatus}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="board">
          {board.columns.map((col) => (
            <SortableContext
              key={col.id}
              items={(board.cardsByColumn[col.id] || []).map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <Column
                column={col}
                cards={board.cardsByColumn[col.id] || []}
                editingCardId={editingCardId}
                onAddCard={() => onAddCard(col.id)}
                onStartEdit={onStartEdit}
                onCancelEdit={onCancelEdit}
                onSaveEdit={onSaveEdit}
                onDeleteCard={onDeleteCard}
                onRenameColumn={() => onRenameColumn(col.id)}
                onDeleteColumn={() => onDeleteColumn(col.id)}
              />
            </SortableContext>
          ))}
        </div>

        <DragOverlay>
          {activeCard ? <CardOverlay card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      <footer className="footer">
        <span>Saved locally (localStorage).</span>
        <span className="dot">•</span>
        <span>{allCardsFlat.length} cards</span>
      </footer>
    </div>
  );
}
