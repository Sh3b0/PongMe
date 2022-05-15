import * as http from 'http';
import * as path from 'path';
import express from 'express';
import { Server } from 'socket.io';
import { handleClient } from './src/server';

// Create http server and socket.io server
const app = express();
const HTTPServer = http.createServer(app);
const io = new Server(HTTPServer);

// Serve static files to client
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// Listen for incoming connections
HTTPServer.listen(process.env.PORT || 8080, () => {
  console.log(`Listening on *:${process.env.PORT || 8080}`);
});

// Handle incoming socket.io server connections
io.on('connection', (client) => {
  handleClient(client, io);
});
