import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  MeasuringStrategy,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
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

console.log("✅ App.tsx loaded (inline edit + cross-column fix)");

type ColumnType = { id: string; title: string };
type CardType = {
  id: string;
  title: string;
  description?: string;
  meta?: Record<string, any>;
};
type BoardType = {
  columns: ColumnType[];
  cardsByColumn: Record<string, CardType[]>;
};

const DEFAULT_COLUMNS: ColumnType[] = [
  { id: "unsorted", title: "Unsorted" },
  { id: "firstPick", title: "First Pick" },
  { id: "secondPick", title: "Second Pick" },
  { id: "thirdPick", title: "Third Pick" },
  { id: "doNotPick", title: "Do Not Pick" },
];

const DEFAULT_CARDS: BoardType["cardsByColumn"] = {
  unsorted: [],
  firstPick: [],
  secondPick: [],
  thirdPick: [],
  doNotPick: [],
};

export default function App() {
  // ----------------- State -----------------
  const [board, setBoard] = useState<BoardType>(() => {
    const loaded = loadBoard() as BoardType | null;
    if (loaded) {
      console.log("📦 Loaded board from localStorage");
      return loaded;
    }
    console.log("🆕 Using default board");
    return { columns: DEFAULT_COLUMNS, cardsByColumn: DEFAULT_CARDS };
  });

  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Inline editing
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // TBA import UI
  const [compCode, setCompCode] = useState<string>("HIHO");
  const [importStatus, setImportStatus] = useState<string>("");
  const [importing, setImporting] = useState<boolean>(false);

  // ----------------- DnD Sensors -----------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // ----------------- Derived -----------------
  const columnIds = useMemo(() => board.columns.map((c) => c.id), [board.columns]);

  const allCardsFlat = useMemo(() => {
    const out: Array<CardType & { columnId: string }> = [];
    for (const col of board.columns) {
      const cards = board.cardsByColumn[col.id] || [];
      for (const card of cards) out.push({ ...card, columnId: col.id });
    }
    return out;
  }, [board]);

  const activeCard = useMemo(() => {
    if (!activeCardId) return null;
    const found = findCardById(board as any, activeCardId) as any;
    return found ? { ...found.card, columnId: found.columnId } : null;
  }, [activeCardId, board]);

  // ----------------- Persistence -----------------
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveBoard(board as any);
      console.log("💾 Board saved to localStorage");
    }, 150);

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [board]);

  // ----------------- Card Actions -----------------
  const onAddCard = (columnId: string) => {
    console.log(`➕ Add card (inline) requested for column "${columnId}"`);

    const newCard = createCard({
      title: "",
      description: "",
      meta: { temp: true },
    }) as CardType;

    setBoard((prev) => {
      const next = structuredClone(prev);
      next.cardsByColumn[columnId] = next.cardsByColumn[columnId] || [];
      next.cardsByColumn[columnId].unshift(newCard);
      return next;
    });

    setEditingCardId(newCard.id);
  };

  const onStartEdit = (cardId: string) => {
    console.log("📝 Start inline edit:", cardId);
    setEditingCardId(cardId);
  };

  const onCancelEdit = (cardId: string, isTemp: boolean) => {
    console.log("❎ Cancel inline edit:", { cardId, isTemp });
    if (isTemp) {
      setBoard((prev) => deleteCard(prev as any, cardId) as any);
    }
    setEditingCardId(null);
  };

  const onSaveEdit = (cardId: string, patch: any, isTemp: boolean) => {
    console.log("✅ Save inline edit:", { cardId, patch, isTemp });

    setBoard((prev) =>
      updateCard(prev as any, cardId, {
        ...patch,
        meta: {
          ...((findCardById(prev as any, cardId) as any)?.card?.meta || {}),
          ...(patch?.meta || {}),
          temp: false,
        },
      }) as any
    );

    setEditingCardId(null);
  };

  const onDeleteCard = (cardId: string) => {
    if (!confirm("Delete this card?")) return;
    console.log(`🗑️ Deleting card ${cardId}`);
    if (editingCardId === cardId) setEditingCardId(null);
    setBoard((prev) => deleteCard(prev as any, cardId) as any);
  };

  // ----------------- Column Actions -----------------
  const onAddColumn = () => {
    const title = prompt("Column name?");
    if (!title) return;
    console.log(`🧱 Adding column "${title}"`);
    setBoard((prev) => addColumn(prev as any, title) as any);
  };

  const onRenameColumn = (columnId: string) => {
    const col = board.columns.find((c) => c.id === columnId);
    if (!col) return;
    const title = prompt("New column name:", col.title);
    if (!title) return;
    console.log(`🏷️ Renaming column "${columnId}" -> "${title}"`);
    setBoard((prev) => renameColumn(prev as any, columnId, title) as any);
  };

  const onDeleteColumn = (columnId: string) => {
    if (!confirm("Delete this column and all its cards?")) return;
    console.log(`🧨 Deleting column "${columnId}"`);
    setBoard((prev) => deleteColumn(prev as any, columnId) as any);
  };

  const onReset = () => {
    if (!confirm("Reset board to defaults?")) return;
    console.log("🔄 Resetting board");
    const next: BoardType = { columns: DEFAULT_COLUMNS, cardsByColumn: DEFAULT_CARDS };
    setEditingCardId(null);
    setBoard(structuredClone(next));
  };

  // ----------------- TBA Import -----------------
  const importTeamsFromTBA = async () => {
  const eventKey = normalizeEventKey(compCode) as string;
  if (!eventKey) return;

  console.log(`🏟️ Import requested. Input="${compCode}" -> eventKey="${eventKey}"`);

  // ✅ Clear the board FIRST (all columns), then load teams
  console.log("🧼 Clearing board before loading new event teams...");
  setEditingCardId(null);
  setActiveCardId(null);

  setBoard((prev) => {
    const next = structuredClone(prev);

    // Clear cards from ALL columns that exist
    for (const col of next.columns) {
      next.cardsByColumn[col.id] = [];
    }

    // Also clear any stray keys that might exist in cardsByColumn
    for (const key of Object.keys(next.cardsByColumn)) {
      next.cardsByColumn[key] = [];
    }

    return next;
  });

  setImporting(true);
  setImportStatus(`Loading teams for ${eventKey}...`);

  try {
    const teams = (await fetchEventTeamsSimple(eventKey)) as any[];

    const newCards: CardType[] = [];
    for (const t of teams) {
      const teamKey = t.key; // "frc4270"
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
        }) as CardType
      );
    }

    console.log(`✅ Loaded ${teams.length} teams. Setting board to fresh event list.`);
    setImportStatus(`Loaded ${teams.length} teams. Board cleared + refreshed.`);

    // ✅ Put them in Unsorted (fresh)
    setBoard((prev) => {
      const next = structuredClone(prev);
      next.cardsByColumn.unsorted = [...newCards];
      return next;
    });
  } catch (e: any) {
    console.log("❌ Import failed:", e);
    setImportStatus(`Error: ${e?.message || String(e)}`);
  } finally {
    setImporting(false);
  }
};


  // ----------------- DnD Helpers -----------------
  const getColumnIdForDroppable = (id: string) => {
    if (columnIds.includes(id)) return id;
    const found = findCardById(board as any, id) as any;
    if (found) return found.columnId;
    return null;
  };

  // ----------------- DnD Events -----------------
  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(String(event.active.id));
    console.log("🟦 Drag start:", event.active.id);
  };

  const handleDragCancel = () => {
    console.log("🟥 Drag cancel");
    setActiveCardId(null);
  };

  /**
   * ✅ KEY FIX:
   * Move the card as soon as it hovers a different column.
   * This avoids cases where `over` becomes null on drop due to scroll/overflow.
   */
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const fromCol = getColumnIdForDroppable(activeId);
    const toCol = getColumnIdForDroppable(overId);

    if (!fromCol || !toCol) return;
    if (fromCol === toCol) return;

    console.log(`🟪 Drag over: moving ${activeId} from "${fromCol}" -> "${toCol}" (over ${overId})`);

    setBoard((prev) => moveCardAcrossColumns(prev as any, activeId, fromCol, toCol, overId) as any);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over) {
      console.log("⬜ Drag end: no drop target");
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    const fromCol = getColumnIdForDroppable(activeId);
    const toCol = getColumnIdForDroppable(overId);

    if (!fromCol || !toCol) return;

    // If same column, reorder
    if (fromCol === toCol) {
      const cards = board.cardsByColumn[fromCol] || [];
      const oldIndex = cards.findIndex((c) => c.id === activeId);
      const newIndex = cards.findIndex((c) => c.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      console.log(`↕️ Drag end reorder within "${fromCol}": ${oldIndex} -> ${newIndex}`);

      setBoard((prev) => {
        const next = structuredClone(prev);
        next.cardsByColumn[fromCol] = arrayMove(next.cardsByColumn[fromCol], oldIndex, newIndex);
        return next;
      });
      return;
    }

    // Cross-column already handled by onDragOver; this is just a safety net
    console.log(`✅ Drag end cross-column (safety): ${activeId} -> ${toCol}`);
    setBoard((prev) => moveCardAcrossColumns(prev as any, activeId, fromCol, toCol, overId) as any);
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
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.WhileDragging,
          },
        }}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragOver={handleDragOver}
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
