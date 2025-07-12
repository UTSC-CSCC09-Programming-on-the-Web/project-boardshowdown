import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';

const wss = new WebSocketServer({ port: 12345 });
//deploy 8x
wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req);
  console.log('New client connected:', req.socket.remoteAddress);
});
