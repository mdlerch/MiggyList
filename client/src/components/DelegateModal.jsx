import React, { useState, useEffect, useRef } from 'react';

export default function DelegateModal({ onDelegate, onClose }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSubmit(e) {
    e.preventDefault();
    onDelegate(name.trim());
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal delegate-modal" role="dialog" aria-modal="true" aria-labelledby="delegate-modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="delegate-modal-title">Delegate Task</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-field">
              <label htmlFor="delegate-name">Delegate to</label>
              <input
                id="delegate-name"
                ref={inputRef}
                type="text"
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Delegate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
