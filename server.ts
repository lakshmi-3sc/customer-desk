import { createServer } from "http";
import { Server } from "socket.io";
import next from "next";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, turbopack: true });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // Make the io instance globally accessible so API routes can emit events
  (global as any).__socketio = io;

  io.on("connection", (socket) => {
    // Client subscribes to updates for a specific ticket
    socket.on("join:ticket", (ticketId: string) => {
      socket.join(`ticket:${ticketId}`);
    });

    socket.on("leave:ticket", (ticketId: string) => {
      socket.leave(`ticket:${ticketId}`);
    });

    // Client subscribes to all ticket list updates (dashboards)
    socket.on("join:tickets", () => {
      socket.join("tickets");
    });
  });

  httpServer.listen(port, () => {
    console.log(
      `> Ready on http://localhost:${port} [${dev ? "development" : "production"}]`
    );
  });
});
