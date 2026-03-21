import React, { useEffect, useRef } from 'react';

export const EMOJIS = [
  '📋', '🚀', '📣', '🎯', '💡', '🔧', '📊', '🌟', '🛠️', '📝',
  '📅', '✅', '🐛', '💻', '🎨', '📱', '🔍', '📌', '🏆', '💼',
  '🎉', '🔒', '⚡', '🌐', '📦', '🤝', '📈', '🗂️', '🔔', '💬',
  '🧪', '🏗️', '🦄', '🌈', '🔥', '🎓', '🚢', '📐', '🧩', '🎮',
  '🌱', '🦋', '🎬', '🧠', '🎪', '🏄', '🎸', '❤️',
];

// Default emoji for new boards (fallback if none stored)
export function defaultEmoji(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return EMOJIS[hash % EMOJIS.length];
}

export default function EmojiPicker({ currentEmoji, onSelect, onClose, anchorRect }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
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

  // Position the picker below (or above if near bottom) the anchor element
  let style = { position: 'fixed', zIndex: 2000 };
  if (anchorRect) {
    const pickerHeight = 220;
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    if (spaceBelow < pickerHeight) {
      style.bottom = window.innerHeight - anchorRect.top + 6;
      style.top = 'auto';
    } else {
      style.top = anchorRect.bottom + 6;
    }
    style.left = Math.min(anchorRect.left, window.innerWidth - 240);
  }

  return (
    <div ref={ref} className="emoji-picker" style={style}>
      <div className="emoji-picker-title">Choose icon</div>
      <div className="emoji-picker-grid">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            className={`emoji-option${emoji === currentEmoji ? ' selected' : ''}`}
            onClick={() => { onSelect(emoji); onClose(); }}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
