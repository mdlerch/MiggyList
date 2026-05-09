# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install all dependencies (root + client + server)
npm run install:all

# Start both frontend and backend concurrently
npm run dev

# Start only the Express backend (port 3001)
npm run server

# Start only the Vite frontend (port 5173)
npm run client

# Build the frontend for production (output → client/dist/)
cd client && npm run build
```

No linting or test infrastructure exists in this project.

## Architecture

MiggyList is a full-stack task management app with a React/Vite frontend and an Express backend using a JSON flat-file database.

**Key architectural decisions:**
- All backend logic lives in a single file: `server/index.js` (~400 lines) — routes, data access, and auth all in one place
- The data store is `server/db.json` (file-based, no external DB)
- Authentication is stateless: user ID is passed on every request via `x-user-id` header, stored client-side in `localStorage`
- The Vite dev server proxies `/miggylist-api/*` to `http://localhost:3001`, so no CORS issues in dev
- The client is deployed under the `/MiggyList/` base path (configured in `client/vite.config.js`)

**Data model hierarchy:**
```
User → Boards → Groups → Items
```
Items have: title, status, priority, assignee, due_date, description (markdown), points (integer, optional), delegated_to (string, optional), optional `archived_at`

Valid status values: `Inbox`, `Spark`, `Slog`, `In Progress`, `Done`

**Frontend state:** Managed entirely in `App.jsx` via React hooks; child components receive state and callbacks as props. There is no global state library (no Redux, Zustand, etc.).

**Component tree:**
```
App.jsx
├── LoginScreen.jsx
├── Sidebar.jsx          (board list + navigation)
├── Board.jsx            (selected board view)
│   └── Group.jsx        (task column)
│       └── TaskRow.jsx  (individual task)
│           ├── DescriptionModal.jsx  (markdown editor for task description)
│           └── DelegateModal.jsx     (assign task to a named person)
└── InboxProcessor.jsx   (focus timer for inbox tasks)
```

Modals rendered from `App.jsx`: `AddItemModal`, `ArchivedTasksModal`, `StatisticsModal`, `EmojiPicker`. Task-level modals (`DescriptionModal`, `DelegateModal`) are rendered inline from `TaskRow`.

**Styling:** Single global CSS file (`client/src/App.css`) using CSS custom properties. Status and priority colors are defined as CSS variables. No CSS framework or CSS modules.

**Notable behaviors:**
- Archived items older than 30 days are purged when `GET /boards/:id/archived` is called (not on startup)
- `db.json` includes automatic migration logic for the single-user → multi-user format change, and for legacy status label renames
- Task descriptions are rendered as GitHub Flavored Markdown via `react-markdown` + `remark-gfm`
- Drag-and-drop for task reordering uses native HTML5 drag events — no drag library
- Stats are tracked as an event log per user in `db.stats` (events: `created`, `completed`, `archived`, `deleted`, `delegated`), pruned to 90 days. `StatisticsModal` displays counts and a 7-day chart.
- Passwords are stored in plain text in `db.json` — this is intentional for a personal/local app
- Board import/export: boards can be imported via `POST /miggylist-api/boards/import` with the full board JSON structure
