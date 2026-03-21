import React, { useState, useRef, useEffect } from 'react';
import TaskRow from './TaskRow.jsx';

const GROUP_COLORS = [
  '#00c875', '#00bcd4', '#0073ea', '#1976d2',
  '#9c27b0', '#e91e63', '#e2445c', '#ff5722',
  '#fdab3d', '#ff9800', '#f9c74f', '#8bc34a',
  '#607d8b', '#795548', '#9e9e9e', '#323338',
];

function ColorPicker({ currentColor, onSelect, onClose, anchorRect }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const style = { position: 'fixed', zIndex: 2000 };
  if (anchorRect) {
    style.top = anchorRect.bottom + 6;
    style.left = anchorRect.left;
  }

  return (
    <div ref={ref} className="color-picker" style={style}>
      <div className="color-picker-title">Group color</div>
      <div className="color-picker-grid">
        {GROUP_COLORS.map((color) => (
          <button
            key={color}
            className={`color-swatch${color === currentColor ? ' selected' : ''}`}
            style={{ background: color }}
            title={color}
            onClick={() => { onSelect(color); onClose(); }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Group({
  group,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onArchiveItem,
  onDeleteGroup,
  onUpdateGroup,
  dropTarget,
  draggingId,
  onItemDragStart,
  onItemDragOver,
  onItemDrop,
  onDragEnd,
  selectedIds,
  onToggleSelect,
  onToggleGroupSelect,
  isDraggingGroup,
  onGroupDragStart,
  onGroupDragOver,
  onGroupDrop,
  onGroupDragEnd,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(group.name);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorAnchorRect, setColorAnchorRect] = useState(null);
  const dragEnabledRef = useRef(false);

  // Keep nameVal in sync if group.name changes externally
  useEffect(() => { setNameVal(group.name); }, [group.name]);

  function handleNameKeyDown(e) {
    if (e.key === 'Enter') e.target.blur();
    if (e.key === 'Escape') {
      setNameVal(group.name);
      setEditingName(false);
    }
  }

  function handleNameBlur() {
    const name = nameVal.trim();
    if (name && name !== group.name) {
      onUpdateGroup(group.id, { name });
    } else {
      setNameVal(group.name);
    }
    setEditingName(false);
  }

  function handleColorDotClick(e) {
    e.stopPropagation();
    setColorAnchorRect(e.currentTarget.getBoundingClientRect());
    setColorPickerOpen(true);
  }

  return (
    <div
      className={`group-card${isDraggingGroup ? ' group-card-dragging' : ''}`}
      draggable
      onDragStart={(e) => { if (!dragEnabledRef.current) { e.preventDefault(); return; } onGroupDragStart(e); }}
      onDragOver={onGroupDragOver}
      onDrop={onGroupDrop}
      onDragEnd={() => { dragEnabledRef.current = false; onGroupDragEnd(); }}
    >
      {/* Group header */}
      <div
        className="group-header"
        style={{ borderLeft: `4px solid ${group.color}` }}
      >
        {/* Drag handle */}
        <span
          className="group-drag-handle"
          title="Drag to reorder"
          onMouseDown={() => { dragEnabledRef.current = true; }}
          onMouseUp={() => { dragEnabledRef.current = false; }}
        >
          <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
            <circle cx="3.5" cy="3" r="1.2"/><circle cx="8.5" cy="3" r="1.2"/>
            <circle cx="3.5" cy="7" r="1.2"/><circle cx="8.5" cy="7" r="1.2"/>
            <circle cx="3.5" cy="11" r="1.2"/><circle cx="8.5" cy="11" r="1.2"/>
          </svg>
        </span>

        {/* Group select-all checkbox */}
        <input
          type="checkbox"
          className="group-checkbox"
          checked={group.items.length > 0 && group.items.every((i) => selectedIds.has(i.id))}
          ref={(el) => { if (el) el.indeterminate = group.items.length > 0 && group.items.some((i) => selectedIds.has(i.id)) && !group.items.every((i) => selectedIds.has(i.id)); }}
          onChange={() => onToggleGroupSelect(group.id)}
          onClick={(e) => e.stopPropagation()}
          title="Select all in group"
        />

        {/* Collapse toggle */}
        <button
          className="group-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            style={{
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease',
            }}
          >
            <path d="M2 4.5l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Color dot — click to open color picker */}
        <button
          className="group-color-dot"
          style={{ background: group.color }}
          title="Change group color"
          onClick={handleColorDotClick}
        />

        {/* Group name — double-click to rename */}
        {editingName ? (
          <input
            autoFocus
            className="group-title-input"
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="group-title"
            onClick={(e) => { e.stopPropagation(); setEditingName(true); }}
            title="Click to rename"
          >
            {nameVal}
          </span>
        )}

        <span className="group-item-count">{group.items.length}</span>

        {/* Add item (collapsed only) */}
        {collapsed && (
          <button
            className="group-add-item-btn"
            onClick={(e) => { e.stopPropagation(); onAddItem(); }}
            title="Add item"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Add Item
          </button>
        )}

        {/* Delete group */}
        <button
          className="group-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Delete group "${group.name}" and all its items?`)) {
              onDeleteGroup(group.id);
            }
          }}
          title="Delete group"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M3.5 3.5l.667 8h5.666l.667-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Color picker */}
      {colorPickerOpen && (
        <ColorPicker
          currentColor={group.color}
          onSelect={(color) => onUpdateGroup(group.id, { color })}
          onClose={() => setColorPickerOpen(false)}
          anchorRect={colorAnchorRect}
        />
      )}

      {/* Table */}
      {!collapsed && (
        <table className="task-table">
          <thead>
            <tr>
              <th className="col-check"></th>
              <th className="col-drag"></th>
              <th className="col-name" style={{ borderLeft: `4px solid ${group.color}` }}>
                Task Name
              </th>
              <th className="col-desc"></th>
              <th className="col-status">Status</th>
              <th className="col-priority">Priority</th>
              <th className="col-assignee">Assignee</th>
              <th className="col-due">Due Date</th>
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody
            onDragOver={(e) => { e.preventDefault(); onItemDragOver(e, group.id, null); }}
            onDrop={(e) => onItemDrop(e, group.id)}
          >
            {group.items.map((item, index) => (
              <React.Fragment key={item.id}>
                {dropTarget?.groupId === group.id && dropTarget?.insertBeforeId === item.id && (
                  <tr className="drop-indicator-row"><td colSpan={9} /></tr>
                )}
                <TaskRow
                  item={item}
                  groupColor={group.color}
                  onUpdate={(updates) => onUpdateItem(item.id, updates)}
                  onDelete={() => onDeleteItem(item.id)}
                  onArchive={() => onArchiveItem(item.id)}
                  isDragging={draggingId === item.id}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={() => onToggleSelect(item.id)}
                  onDragStart={(e) => onItemDragStart(e, item.id, group.id)}
                  onDragOver={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const isTopHalf = e.clientY < rect.top + rect.height / 2;
                    const insertBeforeId = isTopHalf ? item.id : (group.items[index + 1]?.id ?? null);
                    onItemDragOver(e, group.id, insertBeforeId);
                  }}
                  onDrop={(e) => { e.stopPropagation(); onItemDrop(e, group.id); }}
                  onDragEnd={onDragEnd}
                />
              </React.Fragment>
            ))}
            {dropTarget?.groupId === group.id && dropTarget?.insertBeforeId === null && (
              <tr className="drop-indicator-row"><td colSpan={9} /></tr>
            )}

            {/* Add item row */}
            <tr className="add-item-row">
              <td style={{ borderLeft: `4px solid ${group.color}` }} colSpan={9}>
                <button className="add-item-btn" onClick={onAddItem}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  Add Item
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
