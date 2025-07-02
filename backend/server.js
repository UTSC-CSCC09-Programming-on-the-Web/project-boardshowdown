import http from 'http';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req);
});

server.listen(12345, () => {
  console.log('WebSocket server running at ws://localhost:12345');
});