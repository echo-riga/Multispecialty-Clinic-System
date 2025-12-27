const WebSocket = require('ws');

let onlineUsersRef = null; // Map<string, WebSocket>

function setOnlineUsersMap(map) {
  onlineUsersRef = map;
}

function send(ws, obj) {
  try { ws.send(JSON.stringify(obj)); } catch (_) {}
}

function broadcastTo(usernames, payload) {
  if (!onlineUsersRef) return; // No-op until websocket server initializes
  for (const name of usernames) {
    const target = onlineUsersRef.get(name);
    if (target && target.readyState === WebSocket.OPEN) {
      send(target, payload);
    }
  }
}

module.exports = {
  setOnlineUsersMap,
  broadcastTo
};


