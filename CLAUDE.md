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
Items have: title, status, priority, assignee, due_date, description (markdown), optional `archived_at`

**Frontend state:** Managed entirely in `App.jsx` via React hooks; child components receive state and callbacks as props. There is no global state library (no Redux, Zustand, etc.).

**Component tree:**
```
App.jsx
├── LoginScreen.jsx
├── Sidebar.jsx          (board list + navigation)
├── Board.jsx            (selected board view)
│   └── Group.jsx        (task column)
│       └── TaskRow.jsx  (individual task)
└── InboxProcessor.jsx   (focus timer for inbox tasks)
```

Modals (`AddItemModal`, `DescriptionModal`, `ArchivedTasksModal`, `EmojiPicker`) are rendered from `App.jsx` based on state flags.

**Styling:** Single global CSS file (`client/src/App.css`) using CSS custom properties. Status and priority colors are defined as CSS variables. No CSS framework or CSS modules.

**Notable behaviors:**
- Archived items older than 30 days are auto-purged on server startup
- `db.json` includes automatic migration logic for the single-user → multi-user format change
- Task descriptions are rendered as GitHub Flavored Markdown via `react-markdown` + `remark-gfm`
