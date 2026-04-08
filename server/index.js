const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ── Persistence helpers ─────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'db.json');

function saveLocalCache() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ── Load or initialise DB ───────────────────────────────────────────────────
let db;
if (fs.existsSync(DB_PATH)) {
  const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  // Migrate old format (plain array) to multi-user format
  if (Array.isArray(raw)) {
    console.log('Old single-user db.json detected — migrating to multi-user format');
    const smithId = 'user-smith';
    db = {
      users: [{ id: smithId, username: 'smith', password: 'tree' }],
      boards: { [smithId]: raw },
      stats: {},
    };
    saveLocalCache();
  } else {
    db = raw;
    if (!db.stats) db.stats = {};
    console.log(`Loaded ${db.users.length} user(s) from db.json`);
  }
} else {
  db = { users: [], boards: {}, stats: {} };
  saveLocalCache();
  console.log('db.json not found — created empty multi-user database');
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function getUserBoards(userId) {
  if (!db.boards[userId]) db.boards[userId] = [];
  return db.boards[userId];
}

function findItem(boards, itemId) {
  for (const board of boards) {
    for (const group of board.groups) {
      const item = group.items.find((i) => i.id === itemId);
      if (item) return { board, group, item };
    }
  }
  return null;
}

function findGroup(boards, groupId) {
  for (const board of boards) {
    const group = board.groups.find((g) => g.id === groupId);
    if (group) return { board, group };
  }
  return null;
}

// ── Stats helper ─────────────────────────────────────────────────────────────
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function logEvent(userId, type, boardId) {
  if (!db.stats[userId]) db.stats[userId] = [];
  db.stats[userId].push({ type, boardId, ts: new Date().toISOString() });
  // Prune events older than 90 days to cap storage growth
  const cutoff = Date.now() - NINETY_DAYS_MS;
  db.stats[userId] = db.stats[userId].filter((e) => new Date(e.ts).getTime() > cutoff);
}

// Middleware to require authentication for data routes
function requireAuth(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId || !db.users.find((u) => u.id === userId)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.userId = userId;
  next();
}

// ── Auth Routes ─────────────────────────────────────────────────────────────

// POST /miggylist-api/auth/login
app.post('/miggylist-api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const user = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  res.json({ id: user.id, username: user.username });
});

// POST /miggylist-api/auth/register
app.post('/miggylist-api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  if (db.users.find((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: 'Username already taken' });
  }
  const user = { id: uuidv4(), username, password };
  db.users.push(user);
  db.boards[user.id] = [];
  saveLocalCache();
  res.status(201).json({ id: user.id, username: user.username });
});

// ── Data Routes (all require auth) ─────────────────────────────────────────

// GET /miggylist-api/inbox
app.get('/miggylist-api/inbox', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const tasks = [];
  for (const board of boards) {
    for (const group of board.groups) {
      for (const item of group.items) {
        if (item.status === 'Inbox' && !item.archived_at) {
          tasks.push({ item, boardId: board.id, boardName: board.name, groupId: group.id, groupName: group.name });
        }
      }
    }
  }
  const boardList = boards.map((b) => ({
    id: b.id, name: b.name,
    groups: b.groups.map((g) => ({ id: g.id, name: g.name })),
  }));
  res.json({ tasks, boards: boardList });
});

// GET /miggylist-api/boards
app.get('/miggylist-api/boards', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const summary = boards.map(({ id, name, color, emoji }) => ({ id, name, color, emoji }));
  res.json(summary);
});

// GET /miggylist-api/boards/:id
app.get('/miggylist-api/boards/:id', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const board = boards.find((b) => b.id === req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  // Strip archived items from the response
  const filtered = {
    ...board,
    groups: board.groups.map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.archived_at),
    })),
  };
  res.json(filtered);
});

// GET /miggylist-api/boards/:id/archived
app.get('/miggylist-api/boards/:id/archived', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const board = boards.find((b) => b.id === req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  // Purge items archived more than 30 days ago
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let purged = false;
  for (const group of board.groups) {
    const before = group.items.length;
    group.items = group.items.filter((i) => {
      if (!i.archived_at) return true;
      return (now - new Date(i.archived_at).getTime()) < THIRTY_DAYS_MS;
    });
    if (group.items.length !== before) purged = true;
  }
  if (purged) saveLocalCache();

  const archivedItems = [];
  for (const group of board.groups) {
    for (const item of group.items) {
      if (item.archived_at) {
        archivedItems.push({ item, groupId: group.id, groupName: group.name });
      }
    }
  }
  res.json(archivedItems);
});

// DELETE /miggylist-api/boards/:id/archived  — delete all archived items for a board
app.delete('/miggylist-api/boards/:id/archived', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const board = boards.find((b) => b.id === req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  for (const group of board.groups) {
    group.items = group.items.filter((i) => !i.archived_at);
  }
  saveLocalCache();
  res.status(204).end();
});

// POST /miggylist-api/boards
app.post('/miggylist-api/boards', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const { name, color, emoji } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const board = {
    id: uuidv4(),
    name,
    color: color || '#0073ea',
    emoji: emoji || '📋',
    groups: [],
  };
  boards.push(board);
  saveLocalCache();
  res.status(201).json(board);
});

// POST /miggylist-api/boards/:id/groups
app.post('/miggylist-api/boards/:id/groups', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const board = boards.find((b) => b.id === req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const group = {
    id: uuidv4(),
    name,
    color: color || '#0073ea',
    items: [],
  };
  board.groups.push(group);
  saveLocalCache();
  res.status(201).json(group);
});

// POST /miggylist-api/boards/:id/groups/:groupId/items
app.post('/miggylist-api/boards/:id/groups/:groupId/items', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const board = boards.find((b) => b.id === req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const group = board.groups.find((g) => g.id === req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const { title, status, priority, assignee, due_date, description } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const item = {
    id: uuidv4(),
    title,
    status: status || 'Inbox',
    priority: priority || 'Medium',
    assignee: assignee || '',
    due_date: due_date || '',
    description: description || '',
  };
  group.items.push(item);
  logEvent(req.userId, 'created', req.params.id);
  saveLocalCache();
  res.status(201).json(item);
});

// POST /miggylist-api/boards/import
app.post('/miggylist-api/boards/import', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const incoming = req.body;
  if (!incoming || !incoming.name || !Array.isArray(incoming.groups)) {
    return res.status(400).json({ error: 'Invalid board data' });
  }
  const board = {
    id: uuidv4(),
    name: incoming.name,
    color: incoming.color || '#0073ea',
    emoji: incoming.emoji || '📋',
    groups: (incoming.groups || []).map((g) => ({
      id: uuidv4(),
      name: g.name,
      color: g.color || '#0073ea',
      items: (g.items || []).map((i) => ({
        id: uuidv4(),
        title: i.title,
        status: i.status || 'Inbox',
        priority: i.priority || 'Medium',
        assignee: i.assignee || '',
        due_date: i.due_date || '',
        description: i.description || '',
      })),
    })),
  };
  boards.push(board);
  saveLocalCache();
  res.status(201).json(board);
});

// PUT /miggylist-api/items/:id
app.put('/miggylist-api/items/:id', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const found = findItem(boards, req.params.id);
  if (!found) return res.status(404).json({ error: 'Item not found' });
  const { item, board } = found;
  const { title, status, priority, assignee, due_date, description, delegated_to } = req.body;
  const prevStatus = item.status;
  const wasDelegated = item.delegated_to !== null && item.delegated_to !== undefined;
  if (title !== undefined) item.title = title;
  if (status !== undefined) item.status = status;
  if (priority !== undefined) item.priority = priority;
  if (assignee !== undefined) item.assignee = assignee;
  if (due_date !== undefined) item.due_date = due_date;
  if (description !== undefined) item.description = description;
  if (delegated_to !== undefined) item.delegated_to = delegated_to;
  if (status === 'Done' && prevStatus !== 'Done') logEvent(req.userId, 'completed', board.id);
  if (delegated_to !== undefined && delegated_to !== null && !wasDelegated) logEvent(req.userId, 'delegated', board.id);
  saveLocalCache();
  res.json(item);
});

// PUT /miggylist-api/items/:id/move
app.put('/miggylist-api/items/:id/move', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const found = findItem(boards, req.params.id);
  if (!found) return res.status(404).json({ error: 'Item not found' });
  const { toGroupId, toIndex } = req.body;
  let toGroup = null;
  for (const board of boards) {
    const g = board.groups.find((g) => g.id === toGroupId);
    if (g) { toGroup = g; break; }
  }
  if (!toGroup) return res.status(404).json({ error: 'Target group not found' });
  const { group: fromGroup, item } = found;
  fromGroup.items = fromGroup.items.filter((i) => i.id !== item.id);
  const idx = Math.max(0, Math.min(toIndex, toGroup.items.length));
  toGroup.items.splice(idx, 0, item);
  saveLocalCache();
  res.json(item);
});

// PUT /miggylist-api/boards/reorder  (must be before /miggylist-api/boards/:id to avoid conflict)
app.put('/miggylist-api/boards/reorder', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' });
  const reordered = order.map((id) => boards.find((b) => b.id === id)).filter(Boolean);
  const missing = boards.filter((b) => !order.includes(b.id));
  db.boards[req.userId] = [...reordered, ...missing];
  saveLocalCache();
  res.json(db.boards[req.userId].map(({ id, name, color, emoji }) => ({ id, name, color, emoji })));
});

// PUT /miggylist-api/boards/:id
app.put('/miggylist-api/boards/:id', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const board = boards.find((b) => b.id === req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const { name, color, emoji } = req.body;
  if (name !== undefined) board.name = name;
  if (color !== undefined) board.color = color;
  if (emoji !== undefined) board.emoji = emoji;
  saveLocalCache();
  res.json(board);
});

// PUT /miggylist-api/boards/:boardId/groups/reorder
app.put('/miggylist-api/boards/:boardId/groups/reorder', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const board = boards.find((b) => b.id === req.params.boardId);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' });
  const reordered = order.map((id) => board.groups.find((g) => g.id === id)).filter(Boolean);
  const missing = board.groups.filter((g) => !order.includes(g.id));
  board.groups = [...reordered, ...missing];
  saveLocalCache();
  res.json(board.groups.map(({ id, name }) => ({ id, name })));
});

// PUT /miggylist-api/groups/:id
app.put('/miggylist-api/groups/:id', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const found = findGroup(boards, req.params.id);
  if (!found) return res.status(404).json({ error: 'Group not found' });
  const { group } = found;
  const { name, color } = req.body;
  if (name !== undefined) group.name = name;
  if (color !== undefined) group.color = color;
  saveLocalCache();
  res.json(group);
});

// POST /miggylist-api/items/:id/archive
app.post('/miggylist-api/items/:id/archive', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const found = findItem(boards, req.params.id);
  if (!found) return res.status(404).json({ error: 'Item not found' });
  found.item.archived_at = new Date().toISOString();
  logEvent(req.userId, 'archived', found.board.id);
  saveLocalCache();
  res.json(found.item);
});

// POST /miggylist-api/items/:id/unarchive
app.post('/miggylist-api/items/:id/unarchive', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const found = findItem(boards, req.params.id);
  if (!found) return res.status(404).json({ error: 'Item not found' });
  delete found.item.archived_at;
  saveLocalCache();
  res.json(found.item);
});

// DELETE /miggylist-api/items/:id
app.delete('/miggylist-api/items/:id', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const found = findItem(boards, req.params.id);
  if (!found) return res.status(404).json({ error: 'Item not found' });
  const { group, item, board } = found;
  group.items = group.items.filter((i) => i.id !== item.id);
  logEvent(req.userId, 'deleted', board.id);
  saveLocalCache();
  res.status(204).end();
});

// DELETE /miggylist-api/groups/:id
app.delete('/miggylist-api/groups/:id', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const found = findGroup(boards, req.params.id);
  if (!found) return res.status(404).json({ error: 'Group not found' });
  const { board, group } = found;
  board.groups = board.groups.filter((g) => g.id !== group.id);
  saveLocalCache();
  res.status(204).end();
});

// DELETE /miggylist-api/boards/:id
app.delete('/miggylist-api/boards/:id', requireAuth, (req, res) => {
  const boards = getUserBoards(req.userId);
  const board = boards.find((b) => b.id === req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  db.boards[req.userId] = boards.filter((b) => b.id !== req.params.id);
  saveLocalCache();
  res.status(204).end();
});

// GET /miggylist-api/stats
app.get('/miggylist-api/stats', requireAuth, (req, res) => {
  const { boardId } = req.query;
  const allEvents = db.stats[req.userId] || [];
  const events = boardId ? allEvents.filter((e) => e.boardId === boardId) : allEvents;

  const TYPES = ['created', 'completed', 'archived', 'deleted', 'delegated'];
  function countTypes(evts) {
    const result = {};
    TYPES.forEach((t) => { result[t] = evts.filter((e) => e.type === t).length; });
    return result;
  }

  // Today midnight local time
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCounts = countTypes(events.filter((e) => new Date(e.ts) >= todayStart));

  // Last 7 days including today
  const daily = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayEvents = events.filter((e) => {
      const ts = new Date(e.ts);
      return ts >= dayStart && ts < dayEnd;
    });
    daily.push({ date: dayStart.toISOString().slice(0, 10), ...countTypes(dayEvents) });
  }

  res.json({ today: todayCounts, daily });
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`MiggyList server running on http://localhost:${PORT}`);
});
