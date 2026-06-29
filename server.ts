import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

declare global {
  // eslint-disable-next-line no-var
  var io: SocketIOServer | undefined;
}

const app = next({ dev });
const handle = app.getRequestHandler();

// Track when Next.js is ready. Until then, requests get a 503.
// This lets the HTTP server bind to the port IMMEDIATELY so Render's
// port detection succeeds even on the slow free tier.
let nextReady = false;
const preparePromise = app.prepare().then(() => {
  nextReady = true;
  console.log(`> Next.js handler is ready`);
});

const server = createServer((req, res) => {
  if (!nextReady) {
    res.writeHead(503, { 'Content-Type': 'text/plain', 'Retry-After': '5' });
    res.end('Queue Master is starting up...');
    return;
  }
  const parsedUrl = parse(req.url!, true);
  handle(req, res, parsedUrl);
});

const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});
global.io = io;

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on('join:admin', () => {
    socket.join('admin');
  });
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
  });
});

// Bind to the port IMMEDIATELY — don't wait for Next.js to finish preparing.
// Render's port detector needs to see an open socket fast.
server.listen(port, () => {
  console.log(`> Listening on port ${port} (${dev ? 'dev' : 'prod'}) — waiting for Next.js to finish initializing...`);
});

// Log when fully ready (informational)
preparePromise.catch(err => {
  console.error('Next.js failed to prepare:', err);
  process.exit(1);
});
