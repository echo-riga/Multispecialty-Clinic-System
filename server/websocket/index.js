const WebSocket = require('ws');
const { db } = require('../data/db');
const { setOnlineUsersMap, broadcastTo } = require('../services/realtime');

function initWebsocket(server) {
  const onlineUsers = new Map();
  global.__onlineUsersMap = onlineUsers; // expose for stats
  setOnlineUsersMap(onlineUsers);

  const wss = new WebSocket.Server({ server, path: '/ws' });

  function send(ws, obj) {
    try { ws.send(JSON.stringify(obj)); } catch (_) {}
  }

  function computeContacts(name, role) {
    const set = new Set();
    if (role === 'doctor') {
      // Doctors can chat with other doctors and nurses only
      const users = db.prepare("SELECT username FROM users WHERE role IN ('doctor', 'nurse') AND username != ?").all(name);
      for (const u of users) set.add(u.username);
    } else if (role === 'patient') {
      const appointments = db.prepare('SELECT doctor_name FROM appointments WHERE patient_name = ?').all(name);
      for (const a of appointments) if (a.doctor_name) set.add(a.doctor_name);
      const nurses = db.prepare("SELECT username FROM users WHERE role = 'nurse' AND username != ?").all(name);
      for (const n of nurses) set.add(n.username);
    } else if (role === 'nurse') {
      // Nurses can chat with doctors and other nurses only
      const users = db.prepare("SELECT username FROM users WHERE role IN ('doctor', 'nurse') AND username != ?").all(name);
      for (const u of users) set.add(u.username);
    } else if (role === 'admin') {
      const users = db.prepare('SELECT username FROM users WHERE username != ?').all(name);
      for (const u of users) set.add(u.username);
    }
    return Array.from(set);
  }

  function authenticate(ws, state, name, role) {
    state.username = String(name || '').trim();
    state.role = String(role || '').trim();
    if (!state.username || !state.role) return false;
    onlineUsers.set(state.username, ws);
    send(ws, { type: 'ready', username: state.username, role: state.role });
    send(ws, { type: 'contacts', contacts: computeContacts(state.username, state.role) });
    return true;
  }

  wss.on('connection', (ws, req) => {
    const state = { username: req.headers['x-user'] || '', role: req.headers['x-role'] || '' };
    if (state.username && state.role) authenticate(ws, state, state.username, state.role);

    ws.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(data.toString()); } catch (_) { return; }
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'hello' && (msg.username || msg.role)) {
        authenticate(ws, state, msg.username, msg.role);
        return;
      }
      if (!state.username || !state.role) {
        send(ws, { type: 'error', error: 'Unauthorized' });
        return;
      }
      if (msg.type === 'chat' && msg.to && typeof msg.text === 'string') {
        const to = String(msg.to);
        const text = String(msg.text).slice(0, 2000);
        // Enforce contact permissions
        const allowed = computeContacts(state.username, state.role);
        if (!allowed.includes(to)) {
          send(ws, { type: 'error', error: 'Forbidden recipient' });
          return;
        }
        const payload = { type: 'chat', from: state.username, to, text, ts: Date.now() };
        broadcastTo([to, state.username], payload);
        return;
      }
      if (msg.type === 'contacts') {
        send(ws, { type: 'contacts', contacts: computeContacts(state.username, state.role) });
        return;
      }
    });

    ws.on('close', () => {
      if (state.username) {
        const current = onlineUsers.get(state.username);
        if (current === ws) onlineUsers.delete(state.username);
      }
    });
  });
}

module.exports = { initWebsocket };


