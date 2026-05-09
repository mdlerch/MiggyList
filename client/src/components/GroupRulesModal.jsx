import React, { useState, useEffect } from 'react';

const DUE_DATE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'today', label: 'Today' },
  { value: 'next-sunday', label: 'Next Sunday' },
  { value: 'next-monday', label: 'Next Monday' },
  { value: '2-weeks', label: '2 Weeks from Now' },
];

export default function GroupRulesModal({ group, onSave, onClose }) {
  const [autoDueDate, setAutoDueDate] = useState(group.rules?.auto_due_date || '');
  const [onDoneMoveHere, setOnDoneMoveHere] = useState(group.rules?.on_done_move_here || false);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSave() {
    onSave({ auto_due_date: autoDueDate || null, on_done_move_here: onDoneMoveHere });
    onClose();
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
            <select
              id="auto-due-date"
              value={autoDueDate}
              onChange={(e) => setAutoDueDate(e.target.value)}
            >
              {DUE_DATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="form-field rules-checkbox-field">
            <label className="rules-checkbox-label">
              <input
                type="checkbox"
                checked={onDoneMoveHere}
                onChange={(e) => setOnDoneMoveHere(e.target.checked)}
              />
              Move items here when marked Done
            </label>
            <p className="rules-help-text">
              When any item on this board is set to Done, it moves to this group automatically.
            </p>
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
