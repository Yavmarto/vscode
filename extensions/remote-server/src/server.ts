import * as http from 'http';
import * as express from 'express';
import * as WebSocket from 'ws';

import filesRouter from './api/files';
import kiloRouter from './api/kilo';

export function startServer() {
   const app = express();
   const server = http.createServer(app);
   const wss = new WebSocket.Server({ server });

   app.use('/api/files', filesRouter);
   app.use('/api/kilo', kiloRouter);

   wss.on('connection', (ws) => {
       console.log('Client connected');
       ws.on('close', () => {
           console.log('Client disconnected');
       });
   });

   server.listen(3000, () => {
       console.log('Server started on port 3000');
   });

   return server;
}