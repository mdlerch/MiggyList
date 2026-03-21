import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function DescriptionModal({ item, onSave, onClose }) {
  const [mode, setMode] = useState('write');
  const [text, setText] = useState(item.description || '');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (mode === 'write') textareaRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [text]);

  function handleClose() {
    if (text !== (item.description || '')) {
      onSave(text);
    }
    onClose();
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) handleClose();
  }

  // Insert markdown syntax helpers
  function insertSyntax(before, after = '') {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = text.slice(start, end);
    const replacement = before + selected + after;
    const newText = text.slice(0, start) + replacement + text.slice(end);
    setText(newText);
    // Restore cursor inside the syntax
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + before.length + selected.length + (after ? 0 : 0);
      el.setSelectionRange(
        start + before.length,
        start + before.length + selected.length
      );
    });
  }

  return (
    <div className="modal-overlay desc-modal-overlay" onClick={handleOverlayClick}>
      <div className="modal desc-modal" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header">
          <div className="desc-modal-title-row">
            <span className="desc-modal-item-title">{item.title}</span>
            <span className="desc-modal-label">Description</span>
          </div>
          <button className="modal-close" onClick={handleClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="desc-toolbar">
          {/* Write / Preview tabs */}
          <div className="desc-tabs">
            <button
              className={`desc-tab${mode === 'write' ? ' active' : ''}`}
              onClick={() => setMode('write')}
            >
              Write
            </button>
            <button
              className={`desc-tab${mode === 'preview' ? ' active' : ''}`}
              onClick={() => setMode('preview')}
            >
              Preview
            </button>
          </div>

          {/* Format buttons — only visible in write mode */}
          {mode === 'write' && (
            <div className="desc-format-btns">
              <button className="desc-fmt-btn" title="Bold" onClick={() => insertSyntax('**', '**')}>
                <strong>B</strong>
              </button>
              <button className="desc-fmt-btn" title="Italic" onClick={() => insertSyntax('_', '_')}>
                <em>I</em>
              </button>
              <button className="desc-fmt-btn" title="Strikethrough" onClick={() => insertSyntax('~~', '~~')}>
                <s>S</s>
              </button>
              <span className="desc-fmt-divider"/>
              <button className="desc-fmt-btn" title="Heading" onClick={() => insertSyntax('## ')}>
                H
              </button>
              <button className="desc-fmt-btn" title="Bullet list" onClick={() => insertSyntax('- ')}>
                ≡
              </button>
              <button className="desc-fmt-btn" title="Numbered list" onClick={() => insertSyntax('1. ')}>
                1.
              </button>
              <button className="desc-fmt-btn" title="Checkbox" onClick={() => insertSyntax('- [ ] ')}>
                ☐
              </button>
              <span className="desc-fmt-divider"/>
              <button className="desc-fmt-btn" title="Inline code" onClick={() => insertSyntax('`', '`')}>
                {'</>'}
              </button>
              <button className="desc-fmt-btn" title="Link" onClick={() => insertSyntax('[', '](url)')}>
                🔗
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="desc-body">
          {mode === 'write' ? (
            <textarea
              ref={textareaRef}
              className="desc-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a description… Markdown is supported."
              spellCheck
            />
          ) : (
            <div className="desc-preview markdown-body">
              {text.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
              ) : (
                <p className="desc-empty-preview">Nothing to preview yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <span className="desc-hint">Changes save automatically on close · Markdown supported</span>
          <button className="btn btn-secondary" onClick={onClose}>Discard</button>
          <button className="btn btn-primary" onClick={handleClose}>Save & Close</button>
        </div>
      </div>
    </div>
  );
}
