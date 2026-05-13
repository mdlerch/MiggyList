import React, { useState, useEffect } from 'react';

function formatMinutes(mins) {
  if (mins == null || mins === 0) return '0m';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const METRICS = [
  { key: 'created',   label: 'Created',   color: '#0073ea' },
  { key: 'completed', label: 'Completed', color: '#00c875' },
  { key: 'removed',   label: 'Removed',   color: '#e2445c' },
  { key: 'delegated', label: 'Delegated', color: '#9c27b0' },
];

const STATUS_COLORS = {
  'Inbox':       '#c0c4d0',
  'Spark':       '#f9c74f',
  'Slog':        '#e2445c',
  'In Progress': '#fdab3d',
  'Done':        '#00c875',
};

// ── Donut chart (today view) ─────────────────────────────────────────────────
function DonutChart({ data }) {
  const SIZE = 140, r = 46, cx = SIZE / 2, cy = SIZE / 2;
  const circumference = 2 * Math.PI * r;
  const total = METRICS.reduce((s, m) => s + (data[m.key] || 0), 0);

  if (total === 0) {
    return (
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f2f7" strokeWidth="18" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fill="#ccc">No data</text>
      </svg>
    );
  }

  let accumulated = 0;
  const GAP = total > 1 ? 2 : 0;
  const segments = METRICS
    .filter((m) => (data[m.key] || 0) > 0)
    .map((m) => {
      const fullLen = (data[m.key] / total) * circumference;
      const dashLen = Math.max(0, fullLen - GAP);
      const offset = circumference / 4 - accumulated;
      accumulated += fullLen;
      return { ...m, dashLen, offset };
    });

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {segments.map(({ key, label, color, dashLen, offset }) => (
        <circle
          key={key}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth="20"
          strokeDasharray={`${dashLen} ${circumference - dashLen}`}
          strokeDashoffset={offset}
          strokeLinecap="butt"
        >
          <title>{label}: {data[key]}</title>
        </circle>
      ))}
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="24" fontWeight="700" fill="#333">{total}</text>
      <text x={cx} y={cy + 21} textAnchor="middle" fontSize="10" fill="#aaa">total</text>
    </svg>
  );
}

// ── Bar chart (last 7 days) ──────────────────────────────────────────────────
function BarChart({ daily }) {
  const SHOWN = ['created', 'completed', 'removed'];
  const COLORS = { created: '#0073ea', completed: '#00c875', removed: '#e2445c' };

  const maxVal = Math.max(1, ...daily.flatMap((d) => SHOWN.map((k) => d[k] || 0)));

  const W = 540, H = 170;
  const padL = 28, padR = 8, padT = 10, padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const groupW = chartW / daily.length;
  const barW = Math.min(18, (groupW - 12) / SHOWN.length);
  const barGap = 2;

  const yVal = (v) => padT + chartH - (v / maxVal) * chartH;

  const rawMax = maxVal;
  const tickStep = rawMax <= 5 ? 1 : rawMax <= 10 ? 2 : rawMax <= 20 ? 5 : 10;
  const ticks = [];
  for (let v = 0; v <= rawMax; v += tickStep) ticks.push(v);
  if (ticks[ticks.length - 1] < rawMax) ticks.push(rawMax);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
      {ticks.map((val) => {
        const y = yVal(val);
        return (
          <g key={val}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f0f2f7" strokeWidth="1" />
            <text x={padL - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#c0c4d0">{val}</text>
          </g>
        );
      })}

      {daily.map((day, i) => {
        const centerX = padL + i * groupW + groupW / 2;
        const totalBarW = SHOWN.length * barW + (SHOWN.length - 1) * barGap;
        const startX = centerX - totalBarW / 2;
        const isToday = day.date === todayStr;
        const dateObj = new Date(day.date + 'T12:00:00');
        const dayLabel = dateObj.toLocaleDateString('en', { weekday: 'short' });
        const dateLabel = dateObj.toLocaleDateString('en', { month: 'numeric', day: 'numeric' });

        return (
          <g key={day.date}>
            {SHOWN.map((key, ki) => {
              const val = day[key] || 0;
              const x = startX + ki * (barW + barGap);
              const bH = (val / maxVal) * chartH;
              const y = yVal(val);
              return (
                <rect
                  key={key}
                  x={x}
                  y={val > 0 ? y : padT + chartH - 1}
                  width={barW}
                  height={val > 0 ? bH : 1}
                  rx={3}
                  fill={val > 0 ? COLORS[key] : '#f0f2f7'}
                  opacity={val > 0 ? (isToday ? 1 : 0.75) : 0.4}
                >
                  <title>{dayLabel} {dateLabel} — {key}: {val}</title>
                </rect>
              );
            })}

            <text
              x={centerX}
              y={H - 16}
              textAnchor="middle"
              fontSize="10"
              fontWeight={isToday ? '700' : 'normal'}
              fill={isToday ? '#3949ab' : '#b0b4c0'}
            >
              {dayLabel}
            </text>
            <text
              x={centerX}
              y={H - 5}
              textAnchor="middle"
              fontSize="9"
              fill={isToday ? '#3949ab' : '#c8ccd8'}
            >
              {dateLabel}
            </text>
          </g>
        );
      })}

      <line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH} stroke="#e0e4ef" strokeWidth="1" />
    </svg>
  );
}

// ── Board health snapshot ────────────────────────────────────────────────────
function BoardSnapshot({ snapshot }) {
  if (!snapshot || snapshot.total === 0) {
    return <div className="stats-empty-msg">No active tasks on this board.</div>;
  }

  const { counts, total, statusOrder } = snapshot;

  return (
    <div className="stats-snapshot">
      {statusOrder.map((status) => {
        const count = counts[status] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        const color = STATUS_COLORS[status] || '#ccc';
        return (
          <div key={status} className="stats-snapshot-row">
            <div className="stats-snapshot-label">
              <span className="stats-snapshot-dot" style={{ background: color }} />
              <span>{status}</span>
            </div>
            <div className="stats-snapshot-bar-wrap">
              <div
                className="stats-snapshot-bar"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <div className="stats-snapshot-count">{count}</div>
          </div>
        );
      })}
      <div className="stats-snapshot-total">{total} active tasks</div>
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────
export default function StatisticsModal({ boardId, boardName, userId, onClose }) {
  const [period, setPeriod] = useState('today');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/miggylist-api/stats?boardId=${boardId}`, { headers: { 'x-user-id': userId } })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [boardId, userId]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const summaryData = !data ? null : period === 'today'
    ? data.today
    : data.daily.reduce((acc, d) => {
        METRICS.forEach((m) => { acc[m.key] = (acc[m.key] || 0) + (d[m.key] || 0); });
        return acc;
      }, {});

  // net > 0 → burning down (good), net < 0 → backlog growing (bad)
  const net = summaryData
    ? (summaryData.completed || 0) - (summaryData.created || 0)
    : null;

  const hasAnyToday = data && METRICS.some((m) => (data.today[m.key] || 0) > 0);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal stats-modal" role="dialog" aria-modal="true" aria-labelledby="stats-modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="stats-modal-title">
            Statistics — {boardName}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="modal-body stats-body">
          {/* Period toggle */}
          <div className="stats-period-toggle">
            <button
              className={`stats-period-btn${period === 'today' ? ' active' : ''}`}
              onClick={() => setPeriod('today')}
            >
              Today
            </button>
            <button
              className={`stats-period-btn${period === '7days' ? ' active' : ''}`}
              onClick={() => setPeriod('7days')}
            >
              Last 7 Days
            </button>
          </div>

          {loading ? (
            <div className="stats-loading"><div className="spinner" /> Loading…</div>
          ) : !data ? (
            <div className="stats-empty-msg">Could not load statistics.</div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="stats-cards">
                {METRICS.map((m) => (
                  <div key={m.key} className="stats-card" style={{ borderTop: `3px solid ${m.color}` }}>
                    <div className="stats-card-value" style={{ color: m.color }}>
                      {summaryData[m.key] || 0}
                    </div>
                    <div className="stats-card-label">{m.label}</div>
                  </div>
                ))}
                {net !== null && (() => {
                  const color = net > 0 ? '#00c875' : net < 0 ? '#e2445c' : '#c0c4d0';
                  const label = net > 0 ? 'Burning Down' : net < 0 ? 'Growing' : 'Even';
                  const absNet = Math.abs(net);
                  return (
                    <div className="stats-card" style={{ borderTop: `3px solid ${color}` }}>
                      <div className="stats-card-velocity">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                          {net > 0 ? (
                            <path d="M10 3v14M4 11l6 6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          ) : net < 0 ? (
                            <path d="M10 17V3M4 9l6-6 6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          ) : (
                            <path d="M3 10h14M11 4l6 6-6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          )}
                        </svg>
                        <span style={{ color, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
                          {absNet}
                        </span>
                      </div>
                      <div className="stats-card-label">{label}</div>
                    </div>
                  );
                })()}
              </div>

              {/* Chart */}
              {period === 'today' ? (
                <div className="stats-donut-section">
                  <div className="stats-chart-title">Today's Activity</div>
                  {hasAnyToday ? (
                    <div className="stats-donut-wrap">
                      <DonutChart data={data.today} />
                      <div className="stats-donut-legend">
                        {METRICS.filter((m) => (data.today[m.key] || 0) > 0).map((m) => (
                          <div key={m.key} className="stats-legend-item">
                            <span className="stats-legend-dot" style={{ background: m.color }} />
                            <span className="stats-legend-label">{m.label}</span>
                            <span className="stats-legend-count">{data.today[m.key]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="stats-empty-msg">No activity recorded today yet.</div>
                  )}
                </div>
              ) : (
                <div className="stats-bar-section">
                  <div className="stats-chart-title">Daily Breakdown</div>
                  <BarChart daily={data.daily} />
                  <div className="stats-bar-legend">
                    {['created', 'completed', 'removed'].map((key) => {
                      const m = METRICS.find((x) => x.key === key);
                      return (
                        <span key={key} className="stats-bar-legend-item">
                          <span className="stats-legend-dot" style={{ background: m.color }} />
                          {m.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Time estimates */}
              {data.boardSnapshot && (data.boardSnapshot.pointsTotal > 0 || data.boardSnapshot.pointsCompleted > 0) && (
                <div className="stats-points-section">
                  <div className="stats-chart-title">Time Estimates</div>
                  <div className="stats-points-row">
                    <div className="stats-points-card">
                      <div className="stats-points-value">{formatMinutes(data.boardSnapshot.pointsTotal)}</div>
                      <div className="stats-points-label">Total</div>
                    </div>
                    <div className="stats-points-divider" />
                    <div className="stats-points-card">
                      <div className="stats-points-value" style={{ color: '#00c875' }}>{formatMinutes(data.boardSnapshot.pointsCompleted)}</div>
                      <div className="stats-points-label">Done</div>
                    </div>
                    <div className="stats-points-divider" />
                    <div className="stats-points-card">
                      <div className="stats-points-value" style={{ color: data.boardSnapshot.pointsTotal > 0 ? '#0073ea' : '#c0c4d0' }}>
                        {data.boardSnapshot.pointsTotal > 0
                          ? Math.round((data.boardSnapshot.pointsCompleted / data.boardSnapshot.pointsTotal) * 100)
                          : 0}%
                      </div>
                      <div className="stats-points-label">Complete</div>
                    </div>
                  </div>
                  <div className="stats-points-bar-track">
                    <div
                      className="stats-points-bar-fill"
                      style={{
                        width: data.boardSnapshot.pointsTotal > 0
                          ? `${(data.boardSnapshot.pointsCompleted / data.boardSnapshot.pointsTotal) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Board health snapshot */}
              {data.boardSnapshot && (
                <div className="stats-snapshot-section">
                  <div className="stats-chart-title">Board Health</div>
                  <BoardSnapshot snapshot={data.boardSnapshot} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
