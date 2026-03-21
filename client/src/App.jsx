import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Board from './components/Board.jsx';
import InboxProcessor from './components/InboxProcessor.jsx';
import LoginScreen from './components/LoginScreen.jsx';

function getStoredUser() {
  try {
    const raw = localStorage.getItem('miggylist_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [boardLoading, setBoardLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inboxOpen, setInboxOpen] = useState(false);

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-user-id': currentUser?.id,
    };
  }

  // Fetch board list when user changes
  useEffect(() => {
    if (currentUser) {
      fetchBoards();
    } else {
      setBoards([]);
      setActiveBoardId(null);
      setBoardData(null);
    }
  }, [currentUser]);

  // Fetch full board data when active board changes
  useEffect(() => {
    if (activeBoardId) {
      fetchBoard(activeBoardId);
    }
  }, [activeBoardId]);

  function handleLogin(user) {
    localStorage.setItem('miggylist_user', JSON.stringify(user));
    setCurrentUser(user);
  }

  function handleLogout() {
    localStorage.removeItem('miggylist_user');
    setCurrentUser(null);
    setBoards([]);
    setActiveBoardId(null);
    setBoardData(null);
  }

  async function fetchBoards() {
    try {
      setLoading(true);
      const res = await fetch('/api/boards', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load boards');
      const data = await res.json();
      setBoards(data);
      if (data.length > 0) setActiveBoardId(data[0].id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBoard(id) {
    try {
      setBoardLoading(true);
      const res = await fetch(`/api/boards/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load board');
      const data = await res.json();
      setBoardData(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBoardLoading(false);
    }
  }

  async function handleUpdateBoard(boardId, updates) {
    setBoards((prev) => prev.map((b) => b.id === boardId ? { ...b, ...updates } : b));
    setBoardData((prev) => prev && prev.id === boardId ? { ...prev, ...updates } : prev);
    try {
      await fetch(`/api/boards/${boardId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.error('Failed to save board update:', e);
    }
  }

  async function handleDeleteBoard(boardId) {
    const res = await fetch(`/api/boards/${boardId}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) return;
    setBoards((prev) => prev.filter((b) => b.id !== boardId));
    if (activeBoardId === boardId) {
      const remaining = boards.filter((b) => b.id !== boardId);
      setActiveBoardId(remaining.length > 0 ? remaining[0].id : null);
      if (remaining.length === 0) setBoardData(null);
    }
  }

  async function handleReorderBoards(newOrder) {
    setBoards(newOrder);
    await fetch('/api/boards/reorder', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ order: newOrder.map((b) => b.id) }),
    });
  }

  async function handleCreateBoard(name) {
    const colors = ['#0073ea', '#9c27b0', '#00c875', '#e2445c', '#fdab3d', '#1e7e34'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) return;
    const board = await res.json();
    setBoards((prev) => [...prev, { id: board.id, name: board.name, color: board.color, emoji: board.emoji }]);
    setActiveBoardId(board.id);
  }

  async function handleUpdateGroup(groupId, updates) {
    setBoardData((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => g.id === groupId ? { ...g, ...updates } : g),
    }));
    try {
      await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.error('Failed to save group update:', e);
    }
  }

  async function handleMoveItem(itemId, fromGroupId, toGroupId, toIndex) {
    setBoardData((prev) => {
      const groups = prev.groups.map((g) => ({ ...g, items: [...g.items] }));
      const fromGroup = groups.find((g) => g.id === fromGroupId);
      const toGroup = groups.find((g) => g.id === toGroupId);
      const [item] = fromGroup.items.splice(fromGroup.items.findIndex((i) => i.id === itemId), 1);
      toGroup.items.splice(toIndex, 0, item);
      return { ...prev, groups };
    });
    try {
      await fetch(`/api/items/${itemId}/move`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ toGroupId, toIndex }),
      });
    } catch (e) {
      console.error('Failed to move item:', e);
    }
  }

  async function handleImportBoard(boardData) {
    const res = await fetch('/api/boards/import', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(boardData),
    });
    if (!res.ok) return;
    const board = await res.json();
    setBoards((prev) => [...prev, { id: board.id, name: board.name, color: board.color, emoji: board.emoji }]);
    setActiveBoardId(board.id);
  }

  async function handleCreateGroup(boardId, name) {
    const groupColors = ['#00c875', '#fdab3d', '#e2445c', '#0073ea', '#9c27b0', '#00bcd4'];
    const color = groupColors[Math.floor(Math.random() * groupColors.length)];
    const res = await fetch(`/api/boards/${boardId}/groups`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) return;
    const group = await res.json();
    setBoardData((prev) => ({
      ...prev,
      groups: [...prev.groups, group],
    }));
  }

  async function handleCreateItem(boardId, groupId, itemData) {
    const res = await fetch(`/api/boards/${boardId}/groups/${groupId}/items`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(itemData),
    });
    if (!res.ok) return;
    const item = await res.json();
    setBoardData((prev) => ({
      ...prev,
      groups: prev.groups.map((g) =>
        g.id === groupId ? { ...g, items: [...g.items, item] } : g
      ),
    }));
  }

  async function handleUpdateItem(itemId, updates) {
    const res = await fetch(`/api/items/${itemId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setBoardData((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => ({
        ...g,
        items: g.items.map((i) => (i.id === itemId ? updated : i)),
      })),
    }));
  }

  async function handleDeleteItem(itemId) {
    const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) return;
    setBoardData((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => ({
        ...g,
        items: g.items.filter((i) => i.id !== itemId),
      })),
    }));
  }

  async function handleArchiveItem(itemId) {
    const res = await fetch(`/api/items/${itemId}/archive`, { method: 'POST', headers: authHeaders() });
    if (!res.ok) return;
    setBoardData((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => ({
        ...g,
        items: g.items.filter((i) => i.id !== itemId),
      })),
    }));
  }

  async function handleUnarchiveItem(itemId) {
    const res = await fetch(`/api/items/${itemId}/unarchive`, { method: 'POST', headers: authHeaders() });
    if (!res.ok) return;
    // Refresh the board to show the restored item in its group
    if (activeBoardId) fetchBoard(activeBoardId);
  }

  async function handleDeleteGroup(groupId) {
    const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) return;
    setBoardData((prev) => ({
      ...prev,
      groups: prev.groups.filter((g) => g.id !== groupId),
    }));
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="app-layout">
        <div className="centered-msg">
          <div className="spinner" />
          Loading MiggyList…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-layout">
        <div className="centered-msg" style={{ color: '#e2445c' }}>
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        boards={boards}
        activeBoardId={activeBoardId}
        currentUser={currentUser}
        onSelectBoard={setActiveBoardId}
        onCreateBoard={handleCreateBoard}
        onDeleteBoard={handleDeleteBoard}
        onReorderBoards={handleReorderBoards}
        onUpdateBoard={handleUpdateBoard}
        onImportBoard={handleImportBoard}
        onLogout={handleLogout}
      />
      <div className="main-content">
        {boardLoading ? (
          <div className="centered-msg">
            <div className="spinner" />
            Loading board…
          </div>
        ) : boardData ? (
          <Board
            board={boardData}
            onCreateGroup={(name) => handleCreateGroup(boardData.id, name)}
            onCreateItem={(groupId, item) => handleCreateItem(boardData.id, groupId, item)}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onArchiveItem={handleArchiveItem}
            onUnarchiveItem={handleUnarchiveItem}
            onDeleteGroup={handleDeleteGroup}
            onUpdateBoard={handleUpdateBoard}
            onUpdateGroup={handleUpdateGroup}
            onMoveItem={handleMoveItem}
            onProcessInbox={() => setInboxOpen(true)}
            userId={currentUser?.id}
          />
        ) : (
          <div className="centered-msg">Select a board to get started.</div>
        )}
      </div>
      {inboxOpen && (
        <InboxProcessor
          userId={currentUser.id}
          boardId={activeBoardId}
          onClose={() => { setInboxOpen(false); activeBoardId && fetchBoard(activeBoardId); }}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onCreateItem={handleCreateItem}
          onRefresh={() => activeBoardId && fetchBoard(activeBoardId)}
        />
      )}
    </div>
  );
}
