import React, { useState, useEffect, useRef } from 'react';
import DescriptionModal from './DescriptionModal.jsx';
import PromptModal from './PromptModal.jsx';

const STATUS_OPTIONS = ['Inbox', 'Spark', 'Slog', 'In Progress', 'Done'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

function parseTimeInput(val) {
  const s = val.trim().toLowerCase();
  if (!s) return null;
  const hm = s.match(/^(\d+)\s*h\s*(\d+)m?$/);
  if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2]);
  const h = s.match(/^(\d+)\s*h$/);
  if (h) return parseInt(h[1]) * 60;
  const colon = s.match(/^(\d+):(\d+)$/);
  if (colon) return parseInt(colon[1]) * 60 + parseInt(colon[2]);
  const m = s.match(/^(\d+)\s*m$/);
  if (m) return parseInt(m[1]);
  if (/^\d+$/.test(s)) return parseInt(s);
  return null;
}

function formatMinutes(mins) {
  if (mins == null) return '';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatTimeOfDay(date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function WorkOnModal({ item, onUpdate, onClose }) {
  const isDone = item.status === 'Done';

  const startedAt = useRef(Date.now());
  const pausedSince = useRef(null);
  const totalPausedMs = useRef(0);
  const elapsedRef = useRef(0);

  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  const [titleVal, setTitleVal] = useState(item.title);
  const [pointsVal, setPointsVal] = useState(item.points != null ? formatMinutes(item.points) : '');
  const [actualVal, setActualVal] = useState(item.actual_minutes != null ? formatMinutes(item.actual_minutes) : '');

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !descOpen && !promptOpen) handleClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descOpen, promptOpen]);

  useEffect(() => {
    if (isDone || paused) return;
    const id = setInterval(() => {
      const active = Date.now() - startedAt.current - totalPausedMs.current;
      const secs = Math.floor(active / 1000);
      setElapsed(secs);
      elapsedRef.current = secs;
    }, 1000);
    return () => clearInterval(id);
  }, [isDone, paused]);

  useEffect(() => { setTitleVal(item.title); }, [item.title]);
  useEffect(() => { setPointsVal(item.points != null ? formatMinutes(item.points) : ''); }, [item.points]);
  useEffect(() => { setActualVal(item.actual_minutes != null ? formatMinutes(item.actual_minutes) : ''); }, [item.actual_minutes]);

  function togglePause() {
    if (paused) {
      totalPausedMs.current += Date.now() - pausedSince.current;
      pausedSince.current = null;
    } else {
      pausedSince.current = Date.now();
    }
    setPaused(p => !p);
  }

  function commitTitle() {
    const v = titleVal.trim();
    if (v && v !== item.title) onUpdate({ title: v });
    else setTitleVal(item.title);
  }

  function commitPoints() {
    const v = pointsVal.trim();
    if (v === '') {
      onUpdate({ points: null });
    } else {
      const n = parseTimeInput(v);
      if (n && n > 0) onUpdate({ points: n });
      else setPointsVal(item.points != null ? formatMinutes(item.points) : '');
    }
  }

  function commitActual() {
    const v = actualVal.trim();
    if (v === '') {
      onUpdate({ actual_minutes: null });
    } else {
      const n = parseTimeInput(v);
      if (n && n > 0) onUpdate({ actual_minutes: n });
      else setActualVal(item.actual_minutes != null ? formatMinutes(item.actual_minutes) : '');
    }
  }

  function accumulateSession() {
    const sessionMins = Math.ceil(elapsedRef.current / 60);
    if (sessionMins > 0) {
      onUpdate({ actual_minutes: (item.actual_minutes || 0) + sessionMins });
    }
  }

  function handleClose() {
    if (!isDone) accumulateSession();
    onClose();
  }

  function handleDone() {
    const sessionMins = Math.ceil(elapsedRef.current / 60);
    const updates = { status: 'Done' };
    if (sessionMins > 0) updates.actual_minutes = (item.actual_minutes || 0) + sessionMins;
    onUpdate(updates);
    onClose();
  }

  const remaining = item.points != null ? Math.max(0, item.points * 60 - elapsed) : null;
  const estimatedDone = remaining != null ? new Date(Date.now() + remaining * 1000) : null;

  return (
    <>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
        <div className="modal work-on-modal" role="dialog" aria-modal="true" aria-labelledby="work-on-title">
          {/* Header */}
          <div className="modal-header">
            <h2 className="modal-title" id="work-on-title">{isDone ? 'Review Task' : 'Work On'}</h2>
            <button className="modal-close" onClick={handleClose} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Timer bar — active mode only */}
          {!isDone && (
            <div className="work-on-timer-bar">
              <div className="work-on-timer-block">
                <span className="work-on-timer-label">Started</span>
                <span className="work-on-timer-value">{formatTimeOfDay(new Date(startedAt.current))}</span>
              </div>
              <div className="work-on-timer-block work-on-timer-elapsed">
                <span className="work-on-timer-label">Elapsed</span>
                <div className="work-on-timer-row">
                  <span className={`work-on-timer-value${paused ? ' work-on-timer-paused' : ''}`}>
                    {formatElapsed(elapsed)}
                  </span>
                  <button className="work-on-pause-btn" onClick={togglePause} title={paused ? 'Resume' : 'Pause'}>
                    {paused ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <polygon points="2,1 11,6 2,11"/>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <rect x="2" y="1" width="3" height="10" rx="1"/>
                        <rect x="7" y="1" width="3" height="10" rx="1"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="work-on-timer-block">
                <span className="work-on-timer-label">Est. Done</span>
                <span className="work-on-timer-value">
                  {estimatedDone ? formatTimeOfDay(estimatedDone) : '—'}
                </span>
              </div>
            </div>
          )}

          {/* Body */}
          <div className="modal-body work-on-body">
            {/* Title */}
            <div className="form-field">
              <label htmlFor="wo-title">Task Name</label>
              <input
                id="wo-title"
                type="text"
                value={titleVal}
                onChange={(e) => setTitleVal(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setTitleVal(item.title); e.target.blur(); } }}
              />
            </div>

            {/* Row 1: Status / Priority / Due */}
            <div className="form-row form-row-3">
              <div className="form-field">
                <label htmlFor="wo-status">Status</label>
                <select id="wo-status" value={item.status} onChange={(e) => onUpdate({ status: e.target.value })}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="wo-priority">Priority</label>
                <select id="wo-priority" value={item.priority} onChange={(e) => onUpdate({ priority: e.target.value })}>
                  {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="wo-due">Due Date</label>
                <input
                  id="wo-due"
                  type="date"
                  value={item.due_date || ''}
                  onChange={(e) => onUpdate({ due_date: e.target.value })}
                  onClick={(e) => e.target.showPicker()}
                />
              </div>
            </div>

            {/* Row 2: Estimate / Actual */}
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="wo-points">Estimate</label>
                <input
                  id="wo-points"
                  type="text"
                  placeholder="30m / 1h"
                  value={pointsVal}
                  onChange={(e) => setPointsVal(e.target.value)}
                  onBlur={commitPoints}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                />
              </div>
              <div className="form-field">
                <label htmlFor="wo-actual">Actual</label>
                <input
                  id="wo-actual"
                  type="text"
                  placeholder="30m / 1h"
                  value={actualVal}
                  onChange={(e) => setActualVal(e.target.value)}
                  onBlur={commitActual}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                />
              </div>
            </div>

            {/* Description + Prompt focus buttons */}
            <div className="work-on-focus-btns">
              <button
                type="button"
                className={`work-on-focus-btn${item.description ? ' has-content' : ''}`}
                onClick={() => setDescOpen(true)}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M4 4.5h6M4 7h6M4 9.5h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                </svg>
                Description
                {item.description && <span className="work-on-focus-dot"/>}
              </button>
              <button
                type="button"
                className={`work-on-focus-btn${item.prompt ? ' has-content' : ''}`}
                onClick={() => setPromptOpen(true)}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1.5" y="4" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M7 4V2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <circle cx="7" cy="1.2" r="0.9" fill="currentColor"/>
                  <circle cx="5" cy="7.5" r="1.1" fill="currentColor"/>
                  <circle cx="9" cy="7.5" r="1.1" fill="currentColor"/>
                  <rect x="4.5" y="9.5" width="5" height="1.5" rx="0.4" stroke="currentColor" strokeWidth="1"/>
                </svg>
                AI Prompt
                {item.prompt && <span className="work-on-focus-dot"/>}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            {isDone ? (
              <button type="button" className="btn btn-primary" onClick={handleClose}>Close</button>
            ) : (
              <>
                <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleDone}>Mark Done</button>
              </>
            )}
          </div>
        </div>
      </div>

      {descOpen && (
        <DescriptionModal
          item={item}
          onSave={(description) => onUpdate({ description })}
          onClose={() => setDescOpen(false)}
        />
      )}
      {promptOpen && (
        <PromptModal
          item={item}
          onSave={(prompt) => onUpdate({ prompt })}
          onClose={() => setPromptOpen(false)}
        />
      )}
    </>
  );
}
