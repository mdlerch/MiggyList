import React, { useState, useRef } from 'react';
import DescriptionModal from './DescriptionModal.jsx';
import DelegateModal from './DelegateModal.jsx';

const STATUS_OPTIONS = ['Inbox', 'Not started', 'Working on it', 'Stuck', 'Done'];

function statusClass(status) {
  switch (status) {
    case 'Done': return 'badge-done';
    case 'Working on it': return 'badge-working';
    case 'Stuck': return 'badge-stuck';
    case 'Not started': return 'badge-not-started';
    default: return 'badge-inbox';
  }
}


function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

function dateStatus(dateStr) {
  if (!dateStr) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const diff = (due - today) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'overdue';
  if (diff <= 3) return 'soon';
  return '';
}

// Strip markdown syntax for plain-text preview
function stripMarkdown(md) {
  if (!md) return '';
  return md
    .replace(/!\[.*?\]\(.*?\)/g, '')   // images
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // links
    .replace(/#{1,6}\s+/g, '')          // headings
    .replace(/[*_~`]/g, '')             // bold/italic/strike/code
    .replace(/^\s*[-*+]\s+/gm, '')      // bullets
    .replace(/^\s*\d+\.\s+/gm, '')      // numbered lists
    .replace(/^\s*>\s+/gm, '')          // blockquotes
    .replace(/\n+/g, ' ')              // newlines → space
    .trim();
}

export default function TaskRow({ item, groupColor, onUpdate, onDelete, onArchive, isDragging, onDragStart, onDragOver, onDrop, onDragEnd, isSelected, onToggleSelect }) {
  // Inline editing states
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(item.title);
  const [descOpen, setDescOpen] = useState(false);

  const [editingDue, setEditingDue] = useState(false);
  const [editingPoints, setEditingPoints] = useState(false);
  const [pointsVal, setPointsVal] = useState(item.points != null ? String(item.points) : '');
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);

  // Title handlers
  function commitTitle() {
    const v = titleVal.trim();
    if (v && v !== item.title) onUpdate({ title: v });
    else setTitleVal(item.title);
    setEditingTitle(false);
  }
  function titleKeyDown(e) {
    if (e.key === 'Enter') e.target.blur();
    if (e.key === 'Escape') { setTitleVal(item.title); setEditingTitle(false); }
  }

  // Points handlers
  function commitPoints() {
    const v = pointsVal.trim();
    const n = v === '' ? null : parseInt(v, 10);
    const valid = n === null || (Number.isInteger(n) && n > 0);
    if (valid) {
      onUpdate({ points: n });
      setPointsVal(n != null ? String(n) : '');
    } else {
      setPointsVal(item.points != null ? String(item.points) : '');
    }
    setEditingPoints(false);
  }
  function pointsKeyDown(e) {
    if (e.key === 'Enter') e.target.blur();
    if (e.key === 'Escape') { setPointsVal(item.points != null ? String(item.points) : ''); setEditingPoints(false); }
  }

  // Due date handler
  function handleDueChange(e) {
    const v = e.target.value;
    onUpdate({ due_date: v });
    setEditingDue(false);
  }

  const descPreview = stripMarkdown(item.description);
  const hasDesc = !!item.description;
  const isDelegated = item.delegated_to !== null && item.delegated_to !== undefined;

  return (
    <>
    <tr
      className={`task-row${isDragging ? ' task-row-dragging' : ''}${isSelected ? ' task-row-selected' : ''}${isDelegated ? ' task-row-delegated' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Checkbox */}
      <td className="col-check">
        <input
          type="checkbox"
          className="task-checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
        />
      </td>

      {/* Drag handle */}
      <td className="col-drag">
        <span className="drag-handle">
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
            <circle cx="3" cy="2.5" r="1.2" fill="currentColor"/>
            <circle cx="7" cy="2.5" r="1.2" fill="currentColor"/>
            <circle cx="3" cy="7" r="1.2" fill="currentColor"/>
            <circle cx="7" cy="7" r="1.2" fill="currentColor"/>
            <circle cx="3" cy="11.5" r="1.2" fill="currentColor"/>
            <circle cx="7" cy="11.5" r="1.2" fill="currentColor"/>
          </svg>
        </span>
      </td>

      {/* Task name */}
      <td style={{ borderLeft: `4px solid ${groupColor}` }}>
        <div className="task-name-cell">
          {editingTitle ? (
            <input
              autoFocus
              className="task-name-input"
              value={titleVal}
              onChange={(e) => setTitleVal(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={titleKeyDown}
            />
          ) : (
            <span
              className="task-name-text"
              onClick={() => setEditingTitle(true)}
              title="Click to edit"
            >
              {item.title}
            </span>
          )}
        </div>
        {hasDesc && (
          <div
            className="desc-inline-preview"
            onClick={() => setDescOpen(true)}
            title="Click to edit description"
          >
            {descPreview.length > 80 ? descPreview.slice(0, 80) + '…' : descPreview}
          </div>
        )}
      </td>

      {/* Description icon */}
      <td className="col-desc">
        <button
          className={`desc-trigger${hasDesc ? ' has-desc' : ''}`}
          title={hasDesc ? descPreview : 'Add description'}
          onClick={() => setDescOpen(true)}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="1.5" y="1.5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M3.5 4.5h6M3.5 6.5h6M3.5 8.5h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
          </svg>
        </button>
      </td>

      {/* Status */}
      <td>
        <div className="badge-wrap">
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <span className={`badge ${statusClass(item.status)}`}>
              {item.status}
            </span>
            <select
              className="cell-select"
              value={item.status}
              onChange={(e) => onUpdate({ status: e.target.value })}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer',
                width: '100%',
                height: '100%',
              }}
              title="Change status"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </td>

      {/* Due date */}
      <td>
        {editingDue ? (
          <input
            autoFocus
            type="date"
            className="due-date-input"
            defaultValue={item.due_date}
            onChange={handleDueChange}
            onBlur={() => setEditingDue(false)}
            onFocus={(e) => e.target.showPicker()}
          />
        ) : (
          <span
            className={`due-date-text ${dateStatus(item.due_date)}`}
            onClick={() => setEditingDue(true)}
            title="Click to edit"
          >
            {item.due_date ? formatDate(item.due_date) : (
              <em style={{ color: '#c4c4c4', fontStyle: 'normal' }}>—</em>
            )}
          </span>
        )}
      </td>

      {/* Points */}
      <td className="col-points">
        {editingPoints ? (
          <input
            autoFocus
            type="number"
            min="1"
            step="1"
            className="points-input"
            value={pointsVal}
            onChange={(e) => setPointsVal(e.target.value)}
            onBlur={commitPoints}
            onKeyDown={pointsKeyDown}
          />
        ) : (
          <span
            className="points-text"
            onClick={() => setEditingPoints(true)}
            title="Click to edit"
          >
            {item.points != null ? item.points : <em style={{ color: '#c4c4c4', fontStyle: 'normal' }}>—</em>}
          </span>
        )}
      </td>

      {/* Delegate */}
      <td className="col-delegate">
        {isDelegated ? (
          <div className="delegated-cell">
            <span className="delegated-name">
              {item.delegated_to || 'Delegated'}
            </span>
            <button
              className="undelegate-btn"
              onClick={() => onUpdate({ delegated_to: null })}
              title="Undelegate"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M9 1.5A5 5 0 1 0 10.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M10.5 1.5v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        ) : (
          <button
            className="delegate-btn"
            onClick={() => setDelegateModalOpen(true)}
            title="Delegate this task"
          >
            Delegate
          </button>
        )}
      </td>

      {/* Actions: archive + delete */}
      <td>
        <div className="row-actions">
          <button
            className="row-archive-btn"
            onClick={() => {
              if (window.confirm(`Archive "${item.title}"?`)) onArchive();
            }}
            title="Archive item"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2.5" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M2.5 5.5v5a1 1 0 001 1h7a1 1 0 001-1v-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M5.5 8.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            className="row-delete-btn"
            onClick={() => {
              if (window.confirm(`Permanently delete "${item.title}"?`)) onDelete();
            }}
            title="Delete item"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M3.5 3.5l.667 8h5.666l.667-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>

    {descOpen && (
      <DescriptionModal
        item={item}
        onSave={(description) => onUpdate({ description })}
        onClose={() => setDescOpen(false)}
      />
    )}
    {delegateModalOpen && (
      <DelegateModal
        onDelegate={(name) => { onUpdate({ delegated_to: name }); setDelegateModalOpen(false); }}
        onClose={() => setDelegateModalOpen(false)}
      />
    )}
    </>
  );
}
