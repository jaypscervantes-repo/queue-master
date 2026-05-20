import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

declare global {
  // eslint-disable-next-line no-var
  var io: SocketIOServer | undefined;
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  global.io = io;

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('join:admin', () => {
      socket.join('admin');
      console.log(`[Socket] Admin joined: ${socket.id}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`> Ready on port ${port} (${dev ? 'dev' : 'prod'})`);
  });
});
