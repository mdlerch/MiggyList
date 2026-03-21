import React, { useState, useRef } from 'react';
import EmojiPicker, { defaultEmoji } from './EmojiPicker.jsx';

export default function Sidebar({ boards, activeBoardId, currentUser, onSelectBoard, onCreateBoard, onDeleteBoard, onReorderBoards, onUpdateBoard, onImportBoard, onLogout }) {
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const importRef = useRef(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [pickerBoardId, setPickerBoardId] = useState(null);
  const [pickerAnchorRect, setPickerAnchorRect] = useState(null);

  // Drag state
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onCreateBoard(name);
    setNewName('');
    setShowForm(false);
  }

  function handleCancel() {
    setNewName('');
    setShowForm(false);
  }

  function handleDeleteClick(e, boardId) {
    e.stopPropagation();
    setConfirmDeleteId(boardId);
  }

  function handleConfirmDelete(e, boardId) {
    e.stopPropagation();
    setConfirmDeleteId(null);
    onDeleteBoard(boardId);
  }

  function handleCancelDelete(e) {
    e.stopPropagation();
    setConfirmDeleteId(null);
  }

  function handleIconClick(e, boardId) {
    e.stopPropagation();
    setPickerBoardId(boardId);
    setPickerAnchorRect(e.currentTarget.getBoundingClientRect());
  }

  // ── Drag handlers ───────────────────────────────────────────────────────
  function handleDragStart(e, index) {
    dragItem.current = index;
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {}, 0);
  }

  function handleDragEnter(e, index) {
    dragOverItem.current = index;
    setDragOverIndex(index);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e) {
    e.preventDefault();
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const reordered = [...boards];
    const draggedBoard = reordered.splice(dragItem.current, 1)[0];
    reordered.splice(dragOverItem.current, 0, draggedBoard);
    onReorderBoards(reordered);

    dragItem.current = null;
    dragOverItem.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    dragItem.current = null;
    dragOverItem.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        onImportBoard(data);
      } catch {
        alert('Invalid board file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const pickerBoard = pickerBoardId ? boards.find((b) => b.id === pickerBoardId) : null;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">M</div>
        <span className="sidebar-logo-text">MiggyList</span>
      </div>

      <div className="sidebar-section-label">My Boards</div>

      {/* Board list */}
      <nav className="sidebar-boards">
        {boards.map((board, index) => (
          <div
            key={board.id}
            className={[
              'board-nav-wrapper',
              draggingIndex === index ? 'board-dragging' : '',
              dragOverIndex === index && draggingIndex !== index ? 'board-drag-over' : '',
            ].filter(Boolean).join(' ')}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          >
            {confirmDeleteId === board.id ? (
              <div className="board-delete-confirm" onClick={(e) => e.stopPropagation()}>
                <span className="board-delete-confirm-text">Delete "{board.name}"?</span>
                <div className="board-delete-confirm-actions">
                  <button className="board-delete-yes" onClick={(e) => handleConfirmDelete(e, board.id)}>Delete</button>
                  <button className="board-delete-no" onClick={handleCancelDelete}>Cancel</button>
                </div>
              </div>
            ) : (
              <button
                className={`board-nav-item${activeBoardId === board.id ? ' active' : ''}`}
                onClick={() => onSelectBoard(board.id)}
                title={board.name}
              >
                <span className="board-drag-handle" title="Drag to reorder">
                  <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                    <circle cx="3" cy="2.5" r="1.2" fill="currentColor"/>
                    <circle cx="7" cy="2.5" r="1.2" fill="currentColor"/>
                    <circle cx="3" cy="7" r="1.2" fill="currentColor"/>
                    <circle cx="7" cy="7" r="1.2" fill="currentColor"/>
                    <circle cx="3" cy="11.5" r="1.2" fill="currentColor"/>
                    <circle cx="7" cy="11.5" r="1.2" fill="currentColor"/>
                  </svg>
                </span>
                <span
                  className="board-nav-icon board-nav-icon-btn"
                  style={{ background: board.color + '22', color: board.color }}
                  title="Change icon"
                  onClick={(e) => handleIconClick(e, board.id)}
                >
                  {board.emoji || defaultEmoji(board.name)}
                </span>
                <span className="board-nav-name">{board.name}</span>
                <button
                  className="board-nav-delete"
                  title="Delete board"
                  onClick={(e) => handleDeleteClick(e, board.id)}
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 3.5h9M5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5.5 6v4M7.5 6v4M3 3.5l.5 7a.5.5 0 00.5.5h5a.5.5 0 00.5-.5l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </button>
            )}
          </div>
        ))}

        {/* New board form or button */}
        {showForm ? (
          <form className="sidebar-new-form" onSubmit={handleSubmit}>
            <input
              autoFocus
              type="text"
              placeholder="Board name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && handleCancel()}
            />
            <div className="sidebar-new-form-actions">
              <button type="submit" className="btn-confirm">Add</button>
              <button type="button" className="btn-cancel" onClick={handleCancel}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className="sidebar-board-actions">
            <button className="sidebar-new-board" onClick={() => setShowForm(true)}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              New Board
            </button>
            <button className="sidebar-import-board" onClick={() => importRef.current.click()} title="Import board from file">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 9V1M4 4l2.5-3L9 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 10v1a1.5 1.5 0 001.5 1.5h8A1.5 1.5 0 0012 11v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
            <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
          </div>
        )}
      </nav>

      {/* Emoji picker portal */}
      {pickerBoard && (
        <EmojiPicker
          currentEmoji={pickerBoard.emoji || defaultEmoji(pickerBoard.name)}
          onSelect={(emoji) => onUpdateBoard(pickerBoardId, { emoji })}
          onClose={() => setPickerBoardId(null)}
          anchorRect={pickerAnchorRect}
        />
      )}

      {/* User / logout */}
      <div className="sidebar-user">
        <span className="sidebar-user-name">{currentUser?.username}</span>
        <button className="sidebar-logout" onClick={onLogout} title="Sign out">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2H2.5A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M9.5 10L13 7l-3.5-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
