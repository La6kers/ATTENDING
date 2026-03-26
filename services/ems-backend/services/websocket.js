/**
 * ATTENDING — WebSocket server for real-time EMS → ER communication.
 *
 * Room-based broadcasting:
 *   - 'er:incoming' — ER dashboard subscribes to all incoming EMS updates
 *   - 'ems:{id}'    — Per-encounter room for the EMS tablet view
 *
 * Clients connect to ws://localhost:3001/ws?room=er:incoming
 */

import { WebSocketServer } from 'ws';

let wss = null;

export function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const room = url.searchParams.get('room') || 'er:incoming';
    ws.room = room;
    ws.isAlive = true;

    ws.on('pong', () => { ws.isAlive = true; });

    // Send confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      data: { room, timestamp: new Date().toISOString() }
    }));

    console.log(`WebSocket client connected to room: ${room}`);
  });

  // Heartbeat — clean up dead connections every 30s
  const heartbeat = setInterval(() => {
    if (!wss) { clearInterval(heartbeat); return; }
    wss.clients.forEach(ws => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));

  console.log('WebSocket server initialized on /ws');
}

/**
 * Broadcast a message to all clients in a specific room.
 */
export function broadcast(room, eventType, data) {
  if (!wss) return;
  const message = JSON.stringify({
    type: eventType,
    data,
    timestamp: new Date().toISOString()
  });

  let sent = 0;
  wss.clients.forEach(client => {
    if (client.readyState === 1 && client.room === room) {
      client.send(message);
      sent++;
    }
  });

  if (sent > 0) {
    console.log(`WS broadcast [${room}] ${eventType} → ${sent} client(s)`);
  }
}

/**
 * Get count of connected clients (for health checks).
 */
export function getClientCount() {
  if (!wss) return 0;
  return wss.clients.size;
}
