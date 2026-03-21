import React, { useState, useEffect } from 'react';

function formatDate(iso) {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function daysRemaining(archivedAt) {
  const archived = new Date(archivedAt).getTime();
  const now = Date.now();
  const daysPassed = Math.floor((now - archived) / (1000 * 60 * 60 * 24));
  return 30 - daysPassed;
}

export default function ArchivedTasksModal({ boardId, boardName, userId, onUnarchive, onClose }) {
  const [archivedItems, setArchivedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/miggylist-api/boards/${boardId}/archived`, {
      headers: { 'x-user-id': userId, 'Content-Type': 'application/json' },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setArchivedItems(data))
      .finally(() => setLoading(false));
  }, [boardId]);

  async function handleUnarchive(itemId) {
    await onUnarchive(itemId);
    setArchivedItems((prev) => prev.filter((a) => a.item.id !== itemId));
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal archived-modal">
        <div className="modal-header">
          <span className="modal-title">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ marginRight: 8, verticalAlign: -2 }}>
              <rect x="1" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M1 6h13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M5 9.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Archived — {boardName}
          </span>
          <button className="modal-close" onClick={onClose} title="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="archived-modal-body">
          {loading ? (
            <div className="archived-loading">
              <div className="spinner" />
            </div>
          ) : archivedItems.length === 0 ? (
            <div className="archived-empty">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="4" y="10" width="40" height="30" rx="4" stroke="#c4c4c4" strokeWidth="2"/>
                <path d="M4 18h40" stroke="#c4c4c4" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M14 28h20M14 34h12" stroke="#c4c4c4" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <p>No archived tasks for this board.</p>
            </div>
          ) : (
            <table className="archived-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Group</th>
                  <th>Archived</th>
                  <th>Deletes in</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {archivedItems.map(({ item, groupName }) => {
                  const days = daysRemaining(item.archived_at);
                  return (
                    <tr key={item.id} className="archived-row">
                      <td className="archived-title">{item.title}</td>
                      <td className="archived-group-name">{groupName}</td>
                      <td className="archived-date">{formatDate(item.archived_at)}</td>
                      <td className={`archived-days${days <= 7 ? ' expiring-soon' : ''}`}>
                        {days}d
                      </td>
                      <td className="archived-actions">
                        <button
                          className="unarchive-btn"
                          onClick={() => handleUnarchive(item.id)}
                          title="Restore to board"
                        >
                          Unarchive
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
