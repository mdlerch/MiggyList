import React, { useState, useEffect, useRef } from 'react';

const STATUS_OPTIONS = ['Inbox', 'Not started', 'Working on it', 'Stuck', 'Done'];

export default function AddItemModal({ onSubmit, onClose }) {
  const twoWeeksFromNow = new Date();
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
  const defaultDueDate = twoWeeksFromNow.toISOString().slice(0, 10);

  const [form, setForm] = useState({
    title: '',
    status: 'Inbox',
    due_date: defaultDueDate,
  });
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
    // Close on Escape
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) {
      titleRef.current?.focus();
      return;
    }
    onSubmit({ ...form, title });
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">Add New Item</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Title */}
            <div className="form-field">
              <label htmlFor="item-title">Task Name *</label>
              <input
                id="item-title"
                ref={titleRef}
                name="title"
                type="text"
                placeholder="What needs to be done?"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>

            {/* Status + Due date */}
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="item-status">Status</label>
                <select
                  id="item-status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="item-due">Due Date</label>
                <input
                  id="item-due"
                  name="due_date"
                  type="date"
                  value={form.due_date}
                  onChange={handleChange}
                  onClick={(e) => e.target.showPicker()}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
