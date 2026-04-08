import React, { useState, useEffect, useRef, useCallback } from 'react';

const STATUS_OPTIONS  = ['Inbox', 'Not started', 'Working on it', 'Stuck', 'Done'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const TIMER_PRESETS   = [
  { label: '1 min',  seconds: 60   },
  { label: '5 min',  seconds: 300  },
  { label: '10 min', seconds: 600  },
  { label: '15 min', seconds: 900  },
  { label: '20 min', seconds: 1200 },
  { label: '30 min', seconds: 1800 },
];

function pad(n) { return String(n).padStart(2, '0'); }
function formatTime(s) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }

function statusClass(s) {
  if (s === 'Done')          return 'badge-done';
  if (s === 'Working on it') return 'badge-working';
  if (s === 'Stuck')         return 'badge-stuck';
  if (s === 'Not started')   return 'badge-not-started';
  return 'badge-inbox';
}
function priorityClass(p) {
  if (p === 'Critical') return 'badge-critical';
  if (p === 'High')     return 'badge-high';
  if (p === 'Medium')   return 'badge-medium';
  return 'badge-low';
}
function stripMd(md = '') {
  return md.replace(/[#*_~`>\-\[\]]/g, '').replace(/\s+/g, ' ').trim();
}

// ── Processing view ──────────────────────────────────────────────────────────
function ProcessingView({ task }) {
  const { item, boardName, groupName } = task;
  const preview = stripMd(item.description);
  return (
    <div className="inbox-body">
      <div className="inbox-context">{boardName} › {groupName}</div>
      <h2 className="inbox-task-title">{item.title}</h2>
      <div className="inbox-task-meta">
        <span className={`badge ${statusClass(item.status)}`}>{item.status}</span>
        <span className={`badge ${priorityClass(item.priority)}`}>{item.priority}</span>
        {item.assignee && <span className="inbox-chip">👤 {item.assignee}</span>}
        {item.due_date && <span className="inbox-chip">📅 {item.due_date}</span>}
      </div>
      {preview && (
        <p className="inbox-desc-preview">
          {preview.length > 200 ? preview.slice(0, 200) + '…' : preview}
        </p>
      )}
    </div>
  );
}

// ── Focus / timer view ───────────────────────────────────────────────────────
function FocusView({ task, onCancel, onDone }) {
  const [elapsed,       setElapsed]       = useState(0);
  const [countdown,     setCountdown]     = useState(null); // null = stopwatch
  const [countdownFrom, setCountdownFrom] = useState(null);
  const [running,       setRunning]       = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!running) return;
    intervalRef.current = setInterval(() => {
      if (countdown === null) {
        setElapsed((e) => e + 1);
      } else {
        setCountdown((c) => {
          if (c <= 1) { setRunning(false); return 0; }
          return c - 1;
        });
      }
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, countdown === null]); // eslint-disable-line

  function switchToPreset(preset) {
    clearInterval(intervalRef.current);
    setCountdownFrom(preset.seconds);
    setCountdown(preset.seconds);
    setRunning(true);
  }

  const displayTime = countdown !== null ? countdown : elapsed;
  const isExpired   = countdown !== null && countdown === 0;
  const progress    = countdown !== null && countdownFrom ? countdown / countdownFrom : null;

  return (
    <>
      <div className="inbox-body focus-body">
        <div className="focus-task-name">{task.item.title}</div>

        <div className={`focus-timer${isExpired ? ' expired' : ''}`}>
          {formatTime(displayTime)}
        </div>

        {isExpired && <p className="focus-expired">Time's up! Click Done when ready.</p>}

        {progress !== null && (
          <div className="focus-progress-track">
            <div className="focus-progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        )}

        <div className="focus-presets">
          {TIMER_PRESETS.map((p) => (
            <button
              key={p.seconds}
              className={`focus-preset${countdownFrom === p.seconds ? ' active' : ''}`}
              onClick={() => switchToPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={onDone}>Done ✓</button>
      </div>
    </>
  );
}

// ── Edit view ────────────────────────────────────────────────────────────────
function EditView({ form, onChange, groupKey, onGroupChange, allGroups, onCancel, onSave }) {
  function set(field, value) { onChange((f) => ({ ...f, [field]: value })); }

  return (
    <>
      <div className="inbox-body edit-body">
        <div className="form-field">
          <label>Task Name *</label>
          <input
            autoFocus
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
          />
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Priority</label>
            <select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {PRIORITY_OPTIONS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Assignee</label>
            <input
              type="text"
              value={form.assignee}
              onChange={(e) => set('assignee', e.target.value)}
              placeholder="Name"
            />
          </div>
          <div className="form-field">
            <label>Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => set('due_date', e.target.value)}
            />
          </div>
        </div>

        <div className="form-field">
          <label>Group</label>
          <select value={groupKey} onChange={(e) => onGroupChange(e.target.value)}>
            {allGroups.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>Description</label>
          <textarea
            className="inbox-desc-textarea"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="What is the first step to accomplish this task?"
            rows={4}
          />
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={onSave}>Save</button>
      </div>
    </>
  );
}

// ── All-done view ────────────────────────────────────────────────────────────
function AllDoneView({ onClose }) {
  return (
    <>
      <div className="inbox-body inbox-all-done">
        <div className="inbox-done-emoji">🎉</div>
        <h3 className="inbox-done-title">Inbox cleared!</h3>
        <p className="inbox-done-sub">All inbox tasks have been processed.</p>
      </div>
      <div className="modal-footer">
        <button className="btn btn-primary" onClick={onClose}>Close</button>
      </div>
    </>
  );
}

// ── Delegate view ────────────────────────────────────────────────────────────
function DelegateView({ onDelegate, onCancel }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <>
      <div className="inbox-body edit-body">
        <div className="form-field">
          <label>Delegate to</label>
          <input
            ref={inputRef}
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onDelegate(name.trim())}
          />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onDelegate(name.trim())}>Delegate</button>
      </div>
    </>
  );
}

// ── Celebration overlay ──────────────────────────────────────────────────────
function Celebration() {
  return (
    <div className="inbox-celebration">
      <div className="inbox-celebration-ring" />
      <div className="inbox-celebration-check">✓</div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function InboxProcessor({ userId, boardId, onClose, onUpdateItem, onDeleteItem, onCreateItem, onRefresh }) {
  const [loading,     setLoading]     = useState(true);
  const [tasks,       setTasks]       = useState([]);   // [{item, boardId, boardName, groupId, groupName}]
  const [allGroups,   setAllGroups]   = useState([]);   // [{value, label, boardId, groupId}]
  const [idx,         setIdx]         = useState(0);
  const [mode,        setMode]        = useState('processing'); // 'processing'|'focus'|'edit'
  const [celebration, setCelebration] = useState(false);

  // Edit form state
  const [editForm,     setEditForm]     = useState(null);
  const [editGroupKey, setEditGroupKey] = useState('');

  // Fetch inbox data on mount
  useEffect(() => {
    fetch('/miggylist-api/inbox', { headers: { 'x-user-id': userId } })
      .then((r) => r.json())
      .then((data) => {
        setTasks(data.tasks.filter((t) => t.boardId === boardId));
        setAllGroups(
          data.boards.flatMap((b) =>
            b.groups.map((g) => ({
              value: `${b.id}::${g.id}`,
              label: `${b.name} › ${g.name}`,
              groupName: g.name,
              boardId: b.id,
              groupId: g.id,
            }))
          )
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Escape to close
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const current = tasks[idx];
  const isDone  = !loading && idx >= tasks.length;

  function advance() {
    setIdx((i) => i + 1);
    setMode('processing');
  }

  // ── Button handlers ────────────────────────────────────────────────────────

  function handleSkip() { advance(); }

  function handleDoTask() { setMode('focus'); }

  function handleFocusCancel() { setMode('processing'); }

  async function handleFocusDone() {
    await onUpdateItem(current.item.id, { status: 'Done' });
    setCelebration(true);
    setTimeout(() => {
      setCelebration(false);
      advance();
    }, 1600);
  }

  function handleEditOpen() {
    setEditForm({
      title:       current.item.title,
      status:      current.item.status,
      priority:    current.item.priority,
      assignee:    current.item.assignee || '',
      due_date:    current.item.due_date || '',
      description: current.item.description || '',
    });
    setEditGroupKey(`${current.boardId}::${current.groupId}`);
    setMode('edit');
  }

  async function handleEditSave() {
    if (!editForm.title.trim()) return;
    const oldKey = `${current.boardId}::${current.groupId}`;

    if (editGroupKey !== oldKey) {
      // Move to different group: delete then re-create
      const [newBoardId, newGroupId] = editGroupKey.split('::');
      await onDeleteItem(current.item.id);
      await onCreateItem(newBoardId, newGroupId, editForm);
    } else {
      await onUpdateItem(current.item.id, editForm);
    }
    onRefresh();
    advance();
  }

  async function handleDelegateSave(name) {
    await onUpdateItem(current.item.id, { delegated_to: name });
    advance();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const totalCount = tasks.length;
  const progress   = totalCount > 0 ? `${Math.min(idx + 1, totalCount)} of ${totalCount}` : '';

  return (
    <div className="modal-overlay inbox-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal inbox-modal">

        {celebration && <Celebration />}

        {/* Header */}
        <div className="modal-header">
          <div className="inbox-header-left">
            <h2 className="modal-title">Inbox Processing</h2>
            {!isDone && !loading && (
              <span className="inbox-progress-badge">{progress}</span>
            )}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="inbox-body inbox-loading">
            <div className="spinner" /> Loading inbox tasks…
          </div>
        ) : isDone ? (
          <AllDoneView onClose={onClose} />
        ) : mode === 'focus' ? (
          <FocusView task={current} onCancel={handleFocusCancel} onDone={handleFocusDone} />
        ) : mode === 'edit' ? (
          <EditView
            form={editForm}
            onChange={setEditForm}
            groupKey={editGroupKey}
            onGroupChange={setEditGroupKey}
            allGroups={allGroups.filter((g) => g.boardId === current.boardId).map((g) => ({ ...g, label: g.groupName }))}
            onCancel={() => setMode('processing')}
            onSave={handleEditSave}
          />
        ) : mode === 'delegate' ? (
          <DelegateView
            onDelegate={handleDelegateSave}
            onCancel={() => setMode('processing')}
          />
        ) : (
          <>
            <ProcessingView task={current} />
            <div className="modal-footer inbox-footer">
              <button className="btn inbox-btn-do"       onClick={handleDoTask}>▶ Do Task Now</button>
              <button className="btn inbox-btn-delegate" onClick={() => setMode('delegate')}>Delegate</button>
              <button className="btn inbox-btn-skip"     onClick={handleSkip}>Skip</button>
              <button className="btn inbox-btn-edit"     onClick={handleEditOpen}>Update Task</button>
              <button className="btn btn-secondary"      onClick={onClose}>Stop Processing</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
