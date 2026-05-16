import React, { useState, useEffect } from 'react';

const DUE_DATE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'today', label: 'Today' },
  { value: 'next-sunday', label: 'Next Sunday' },
  { value: 'next-monday', label: 'Next Monday' },
  { value: '2-weeks', label: '2 Weeks from Now' },
];

const STATUS_OPTIONS = ['Inbox', 'Spark', 'Slog', 'In Progress', 'Done'];

function nextDayOfWeek(day) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (day - today.getDay() + 7) % 7 || 7;
  const result = new Date(today);
  result.setDate(today.getDate() + diff);
  return result.toISOString().slice(0, 10);
}

function computeDate(rule) {
  switch (rule) {
    case 'today': return new Date().toISOString().slice(0, 10);
    case 'next-sunday': return nextDayOfWeek(0);
    case 'next-monday': return nextDayOfWeek(1);
    case '2-weeks': {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return d.toISOString().slice(0, 10);
    }
    default: return null;
  }
}

export default function GroupRulesModal({ group, onSave, onClose, onApplyDueDateRule, onApplyStatusMoveRule }) {
  const [autoDueDate, setAutoDueDate] = useState(group.rules?.auto_due_date || '');
  const [onStatusMoveHere, setOnStatusMoveHere] = useState(
    () => new Set(group.rules?.on_status_move_here || [])
  );

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggleStatus(status) {
    setOnStatusMoveHere((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status); else next.add(status);
      return next;
    });
  }

  function handleSave() {
    onSave({
      auto_due_date: autoDueDate || null,
      on_status_move_here: [...onStatusMoveHere],
    });
    onClose();
  }

  function handleApplyDueDate() {
    const date = computeDate(autoDueDate);
    if (date) onApplyDueDateRule(date);
  }

  function handleApplyStatusMove() {
    onApplyStatusMoveRule([...onStatusMoveHere]);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="rules-modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="rules-modal-title">Group Rules — {group.name}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="form-field">
            <label htmlFor="auto-due-date">Auto due date for new items</label>
            <div className="rules-apply-row">
              <select
                id="auto-due-date"
                value={autoDueDate}
                onChange={(e) => setAutoDueDate(e.target.value)}
              >
                {DUE_DATE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {autoDueDate && (
                <button type="button" className="btn btn-secondary rules-apply-btn" onClick={handleApplyDueDate}>
                  Apply now
                </button>
              )}
            </div>
          </div>

          <div className="form-field">
            <label>Move items here when status is set to</label>
            <div className="rules-status-list">
              {STATUS_OPTIONS.map((status) => (
                <label key={status} className="rules-status-option">
                  <input
                    type="checkbox"
                    checked={onStatusMoveHere.has(status)}
                    onChange={() => toggleStatus(status)}
                  />
                  {status}
                </label>
              ))}
            </div>
            {onStatusMoveHere.size > 0 && (
              <button type="button" className="btn btn-secondary rules-apply-btn" onClick={handleApplyStatusMove}>
                Apply now
              </button>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>Save Rules</button>
        </div>
      </div>
    </div>
  );
}
