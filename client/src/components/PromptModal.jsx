import React, { useState, useEffect, useRef } from 'react';

export default function PromptModal({ item, onSave, onClose }) {
  const [text, setText] = useState(item.prompt || '');
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [text]);

  function handleClose() {
    if (text !== (item.prompt || '')) {
      onSave(text);
    }
    onClose();
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) handleClose();
  }

  return (
    <div className="modal-overlay desc-modal-overlay" onClick={handleOverlayClick}>
      <div className="modal desc-modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="desc-modal-title-row">
            <span className="desc-modal-item-title">{item.title}</span>
            <span className="desc-modal-label">AI Prompt</span>
          </div>
          <button className="modal-close" onClick={handleClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="desc-body">
          <textarea
            ref={textareaRef}
            className="desc-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a prompt for an AI agent to execute this task…"
            spellCheck
          />
        </div>

        <div className="modal-footer">
          <span className="desc-hint">Changes save automatically on close</span>
          <button className="btn btn-secondary" onClick={onClose}>Discard</button>
          <button className="btn btn-primary" onClick={handleClose}>Save & Close</button>
        </div>
      </div>
    </div>
  );
}
