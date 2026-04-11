import React, { useState, useRef, useEffect } from 'react';

const STATUS_OPTIONS = ['Inbox', 'Spark', 'Slog', 'In Progress', 'Done'];

function GroupGap({ index, active, isOver, onDragOver, onDrop }) {
  return (
    <div
      className={`group-gap${active ? ' group-gap-active' : ''}${isOver ? ' group-gap-over' : ''}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    />
  );
}
import Group from './Group.jsx';
import AddItemModal from './AddItemModal.jsx';
import EmojiPicker, { defaultEmoji } from './EmojiPicker.jsx';
import ArchivedTasksModal from './ArchivedTasksModal.jsx';
import StatisticsModal from './StatisticsModal.jsx';

export default function Board({
  board,
  onCreateGroup,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onArchiveItem,
  onUnarchiveItem,
  onDeleteGroup,
  onUpdateBoard,
  onUpdateGroup,
  onMoveItem,
  onReorderGroups,
  onProcessInbox,
  userId,
}) {
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [modalState, setModalState] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAnchorRect, setPickerAnchorRect] = useState(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  // ── Board title editing ────────────────────────────────────────────────────
  const [editingBoardTitle, setEditingBoardTitle] = useState(false);
  const [boardTitleVal, setBoardTitleVal] = useState(board.name);
  useEffect(() => setBoardTitleVal(board.name), [board.name]);

  function commitBoardTitle() {
    const name = boardTitleVal.trim();
    if (name && name !== board.name) onUpdateBoard(board.id, { name });
    else setBoardTitleVal(board.name);
    setEditingBoardTitle(false);
  }

  // ── Bulk selection ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set());

  function handleToggleSelect(itemId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  }

  function handleToggleGroupSelect(groupId) {
    const group = board.groups.find((g) => g.id === groupId);
    if (!group) return;
    const allSelected = group.items.length > 0 && group.items.every((i) => selectedIds.has(i.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) group.items.forEach((i) => next.delete(i.id));
      else group.items.forEach((i) => next.add(i.id));
      return next;
    });
  }

  async function handleBulkUpdateStatus(status) {
    await Promise.all([...selectedIds].map((id) => onUpdateItem(id, { status })));
    setSelectedIds(new Set());
  }

  async function handleBulkMoveToGroup(toGroupId) {
    const ids = [...selectedIds];
    let appendIdx = board.groups.find((g) => g.id === toGroupId)?.items.length ?? 0;
    for (const itemId of ids) {
      const fromGroup = board.groups.find((g) => g.items.some((i) => i.id === itemId));
      if (fromGroup && fromGroup.id !== toGroupId) {
        await onMoveItem(itemId, fromGroup.id, toGroupId, appendIdx++);
      }
    }
    setSelectedIds(new Set());
  }

  async function handleBulkArchive() {
    await Promise.all([...selectedIds].map((id) => onArchiveItem(id)));
    setSelectedIds(new Set());
  }

  // ── Item drag state ────────────────────────────────────────────────────────
  const [dropTarget, setDropTarget] = useState(null); // { groupId, insertBeforeId }
  const [draggingId, setDraggingId] = useState(null);
  const draggingRef = useRef(null); // { itemId, fromGroupId }

  // ── Group drag state ───────────────────────────────────────────────────────
  const [draggingGroupId, setDraggingGroupId] = useState(null);
  const [groupDropIndex, setGroupDropIndex] = useState(null);
  const draggingGroupRef = useRef(null);
  const groupDropIndexRef = useRef(null); // ref mirror so handleGroupDrop never reads stale closure

  function handleItemDragStart(e, itemId, groupId) {
    draggingRef.current = { itemId, groupId };
    setDraggingId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  }

  function handleItemDragOver(e, groupId, insertBeforeId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget((prev) =>
      prev?.groupId === groupId && prev?.insertBeforeId === insertBeforeId
        ? prev
        : { groupId, insertBeforeId }
    );
  }

  function handleItemDrop(e, toGroupId) {
    e.preventDefault();
    if (!draggingRef.current || !dropTarget) { handleDragEnd(); return; }
    const { itemId, groupId: fromGroupId } = draggingRef.current;
    const insertBeforeId = dropTarget.insertBeforeId;

    const toGroup = board.groups.find((g) => g.id === toGroupId);
    let toIndex = insertBeforeId !== null
      ? toGroup.items.findIndex((i) => i.id === insertBeforeId)
      : toGroup.items.length;
    if (toIndex === -1) toIndex = toGroup.items.length;

    if (fromGroupId === toGroupId) {
      const fromIndex = toGroup.items.findIndex((i) => i.id === itemId);
      if (fromIndex === toIndex || fromIndex + 1 === toIndex) { handleDragEnd(); return; }
      if (fromIndex < toIndex) toIndex--;
    }

    onMoveItem(itemId, fromGroupId, toGroupId, toIndex);
    handleDragEnd();
  }

  function handleDragEnd() {
    draggingRef.current = null;
    setDraggingId(null);
    setDropTarget(null);
  }

  function handleGroupDragStart(e, groupId) {
    draggingGroupRef.current = groupId;
    setDraggingGroupId(groupId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', groupId);
  }

  function handleGroupDragOver(e, index) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    groupDropIndexRef.current = index;
    setGroupDropIndex((prev) => prev === index ? prev : index);
  }

  function handleGroupDrop(e) {
    e.preventDefault();
    const fromId = draggingGroupRef.current;
    const toIndex = groupDropIndexRef.current;
    if (!fromId || toIndex === null) { handleGroupDragEnd(); return; }
    const groups = board.groups;
    const fromIndex = groups.findIndex((g) => g.id === fromId);
    if (fromIndex === toIndex || fromIndex + 1 === toIndex) { handleGroupDragEnd(); return; }
    const newGroups = [...groups];
    const [removed] = newGroups.splice(fromIndex, 1);
    newGroups.splice(fromIndex < toIndex ? toIndex - 1 : toIndex, 0, removed);
    onReorderGroups(newGroups);
    handleGroupDragEnd();
  }

  function handleGroupDragEnd() {
    draggingGroupRef.current = null;
    groupDropIndexRef.current = null;
    setDraggingGroupId(null);
    setGroupDropIndex(null);
  }

  const totalItems = board.groups.reduce((sum, g) => sum + g.items.length, 0);

  function handleAddGroupSubmit(e) {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;
    onCreateGroup(name);
    setNewGroupName('');
    setAddingGroup(false);
  }

  function handleOpenModal(groupId) {
    setModalState({ groupId });
  }

  function handleModalSubmit(itemData) {
    if (!modalState) return;
    onCreateItem(modalState.groupId, itemData);
    setModalState(null);
  }

  function handleEmojiClick(e) {
    setPickerAnchorRect(e.currentTarget.getBoundingClientRect());
    setPickerOpen(true);
  }

  const boardEmoji = board.emoji || defaultEmoji(board.name);

  function handleExport() {
    const blob = new Blob([JSON.stringify(board, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${board.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Board header */}
      <div className="board-header">
        <button
          className="board-header-emoji"
          style={{ background: board.color + '18', color: board.color }}
          onClick={handleEmojiClick}
          title="Change icon"
        >
          {boardEmoji}
        </button>
        {editingBoardTitle ? (
          <input
            autoFocus
            className="board-title-input"
            value={boardTitleVal}
            onChange={(e) => setBoardTitleVal(e.target.value)}
            onBlur={commitBoardTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.target.blur();
              if (e.key === 'Escape') { setBoardTitleVal(board.name); setEditingBoardTitle(false); }
            }}
          />
        ) : (
          <h1
            className="board-header-title"
            onDoubleClick={() => setEditingBoardTitle(true)}
            title="Double-click to rename"
          >
            {board.name}
          </h1>
        )}
        <span className="board-header-count">
          {totalItems} item{totalItems !== 1 ? 's' : ''}
        </span>
        <button className="board-export-btn" onClick={handleExport} title="Export board">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 10v1.5A1.5 1.5 0 003.5 13h7a1.5 1.5 0 001.5-1.5V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Export
        </button>
        <button className="board-export-btn" onClick={() => setArchivedOpen(true)} title="View archived tasks">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="2.5" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M2.5 5.5v5a1 1 0 001 1h7a1 1 0 001-1v-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M5.5 8.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Archived
        </button>
        <button className="board-export-btn" onClick={() => setStatsOpen(true)} title="View statistics">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="7" width="2.5" height="6" rx="1" fill="currentColor"/>
            <rect x="5.5" y="4" width="2.5" height="9" rx="1" fill="currentColor"/>
            <rect x="10" y="1.5" width="2.5" height="11.5" rx="1" fill="currentColor"/>
          </svg>
          Statistics
        </button>
        <button className="process-inbox-btn" onClick={onProcessInbox}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M4 6l2.5 2.5L10 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Process Inbox
        </button>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="bulk-action-bar">
          <span className="bulk-count">{selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected</span>
          <select
            className="bulk-select"
            defaultValue=""
            onChange={(e) => { if (e.target.value) { handleBulkUpdateStatus(e.target.value); e.target.value = ''; } }}
          >
            <option value="" disabled>Update status…</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="bulk-select"
            defaultValue=""
            onChange={(e) => { if (e.target.value) { handleBulkMoveToGroup(e.target.value); e.target.value = ''; } }}
          >
            <option value="" disabled>Move to group…</option>
            {board.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button className="bulk-archive-btn" onClick={handleBulkArchive}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ marginRight: 5, verticalAlign: -1 }}>
              <rect x="1" y="2.5" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M2.5 5.5v5a1 1 0 001 1h7a1 1 0 001-1v-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M5.5 8.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Archive
          </button>
          <button className="bulk-clear-btn" onClick={() => setSelectedIds(new Set())}>✕ Clear</button>
        </div>
      )}

      {/* Board body */}
      <div className="board-body">
        {board.groups.length === 0 && !addingGroup && (
          <div className="board-empty">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="12" width="48" height="40" rx="6" stroke="#c4c4c4" strokeWidth="2.5"/>
              <path d="M8 24h48" stroke="#c4c4c4" strokeWidth="2" strokeLinecap="round"/>
              <path d="M20 36h24M20 44h16" stroke="#c4c4c4" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p>No groups yet — add one to get started</p>
          </div>
        )}

        {board.groups.map((group, index) => {
          const gapHandlers = (gapIndex) => ({
            onDragOver: (e) => {
              if (!draggingGroupRef.current) return;
              handleGroupDragOver(e, gapIndex);
            },
            onDrop: (e) => {
              if (!draggingGroupRef.current) return;
              handleGroupDrop(e);
            },
          });
          return (
            <React.Fragment key={group.id}>
              <GroupGap
                index={index}
                active={!!draggingGroupId}
                isOver={groupDropIndex === index}
                {...gapHandlers(index)}
              />
              <Group
                group={group}
                onAddItem={() => handleOpenModal(group.id)}
                onUpdateItem={onUpdateItem}
                onDeleteItem={onDeleteItem}
                onArchiveItem={onArchiveItem}
                onDeleteGroup={onDeleteGroup}
                onUpdateGroup={onUpdateGroup}
                dropTarget={draggingGroupId ? null : dropTarget}
                draggingId={draggingGroupId ? null : draggingId}
                onItemDragStart={handleItemDragStart}
                onItemDragOver={handleItemDragOver}
                onItemDrop={handleItemDrop}
                onDragEnd={handleDragEnd}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleGroupSelect={handleToggleGroupSelect}
                isDraggingGroup={draggingGroupId === group.id}
                groupDragActive={!!draggingGroupId}
                onGroupDragStart={(e) => handleGroupDragStart(e, group.id)}
                onGroupDragOver={(e) => {
                  if (!draggingGroupRef.current) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  handleGroupDragOver(e, e.clientY < rect.top + rect.height / 2 ? index : index + 1);
                }}
                onGroupDrop={(e) => {
                  if (!draggingGroupRef.current) return;
                  handleGroupDrop(e);
                }}
                onGroupDragEnd={handleGroupDragEnd}
              />
            </React.Fragment>
          );
        })}
        <GroupGap
          index={board.groups.length}
          active={!!draggingGroupId}
          isOver={groupDropIndex === board.groups.length}
          onDragOver={(e) => {
            if (!draggingGroupRef.current) return;
            handleGroupDragOver(e, board.groups.length);
          }}
          onDrop={(e) => {
            if (!draggingGroupRef.current) return;
            handleGroupDrop(e);
          }}
        />

        {/* Add Group area */}
        {addingGroup ? (
          <form
            onSubmit={handleAddGroupSubmit}
            style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}
          >
            <input
              autoFocus
              className="group-title-input"
              style={{ maxWidth: 280 }}
              placeholder="Group name…"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setNewGroupName('');
                  setAddingGroup(false);
                }
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}>
              Add
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 14px', fontSize: 13 }}
              onClick={() => { setNewGroupName(''); setAddingGroup(false); }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <button className="add-group-btn" onClick={() => setAddingGroup(true)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Add Group
          </button>
        )}
      </div>

      {/* Add Item modal */}
      {modalState && (
        <AddItemModal
          onSubmit={handleModalSubmit}
          onClose={() => setModalState(null)}
        />
      )}

      {/* Emoji picker */}
      {pickerOpen && (
        <EmojiPicker
          currentEmoji={boardEmoji}
          onSelect={(emoji) => onUpdateBoard(board.id, { emoji })}
          onClose={() => setPickerOpen(false)}
          anchorRect={pickerAnchorRect}
        />
      )}

      {/* Archived tasks modal */}
      {archivedOpen && (
        <ArchivedTasksModal
          boardId={board.id}
          boardName={board.name}
          userId={userId}
          onUnarchive={onUnarchiveItem}
          onDeleteItem={onDeleteItem}
          onClose={() => setArchivedOpen(false)}
        />
      )}

      {/* Statistics modal */}
      {statsOpen && (
        <StatisticsModal
          boardId={board.id}
          boardName={board.name}
          userId={userId}
          onClose={() => setStatsOpen(false)}
        />
      )}
    </>
  );
}
