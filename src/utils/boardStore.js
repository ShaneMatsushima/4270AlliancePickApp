console.log("✅ boardStore.js loaded");

const STORAGE_KEY = "kanban_board_v2";

/** Save / Load */
export function saveBoard(board) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch (e) {
    console.log("❌ Failed to save board:", e);
  }
}

export function loadBoard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.log("❌ Failed to load board:", e);
    return null;
  }
}

/**
 * Create a card with optional metadata (teamNumber, nickname, externalId, etc.)
 */
export function createCard({ title, description, meta = {}, id = null }) {
  const cardId = id || `card_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return {
    id: cardId,
    title: String(title || "").trim(),
    description: String(description || "").trim(),
    meta,
    createdAt: Date.now(),
  };
}

export function findCardById(board, cardId) {
  for (const col of board.columns) {
    const list = board.cardsByColumn[col.id] || [];
    const idx = list.findIndex((c) => c.id === cardId);
    if (idx !== -1) return { columnId: col.id, index: idx, card: list[idx] };
  }
  return null;
}

export function updateCard(board, cardId, patch) {
  const found = findCardById(board, cardId);
  if (!found) return board;

  const next = structuredClone(board);
  const { columnId, index } = found;
  next.cardsByColumn[columnId][index] = {
    ...next.cardsByColumn[columnId][index],
    ...patch,
    updatedAt: Date.now(),
  };
  return next;
}

export function deleteCard(board, cardId) {
  const found = findCardById(board, cardId);
  if (!found) return board;

  const next = structuredClone(board);
  next.cardsByColumn[found.columnId].splice(found.index, 1);
  return next;
}

export function moveCardAcrossColumns(board, cardId, fromCol, toCol, overId) {
  const next = structuredClone(board);
  next.cardsByColumn[fromCol] = next.cardsByColumn[fromCol] || [];
  next.cardsByColumn[toCol] = next.cardsByColumn[toCol] || [];

  const fromIndex = next.cardsByColumn[fromCol].findIndex((c) => c.id === cardId);
  if (fromIndex === -1) return board;

  const [moved] = next.cardsByColumn[fromCol].splice(fromIndex, 1);

  const toIndex = next.cardsByColumn[toCol].findIndex((c) => c.id === overId);
  if (toIndex === -1) next.cardsByColumn[toCol].unshift(moved);
  else next.cardsByColumn[toCol].splice(toIndex, 0, moved);

  return next;
}

export function addColumn(board, title) {
  const id = `col_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const next = structuredClone(board);
  next.columns.push({ id, title: String(title).trim() });
  next.cardsByColumn[id] = [];
  return next;
}

export function renameColumn(board, columnId, newTitle) {
  const next = structuredClone(board);
  const col = next.columns.find((c) => c.id === columnId);
  if (!col) return board;
  col.title = String(newTitle).trim();
  return next;
}

export function deleteColumn(board, columnId) {
  const next = structuredClone(board);
  next.columns = next.columns.filter((c) => c.id !== columnId);
  delete next.cardsByColumn[columnId];
  return next;
}
