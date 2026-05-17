import { createServer } from "http";
import { Server } from "socket.io";
import next from "next";
import { getToken } from "next-auth/jwt";

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
  (globalThis as { __socketio?: Server }).__socketio = io;

  io.on("connection", async (socket) => {
    const token = await getToken({
      req: socket.request as unknown as Parameters<typeof getToken>[0]["req"],
      secret: process.env.NEXTAUTH_SECRET,
    });
    const userId = typeof token?.id === "string" ? token.id : null;

    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on("join:user", (requestedUserId?: string) => {
      if (userId && (!requestedUserId || requestedUserId === userId)) {
        socket.join(`user:${userId}`);
      }
    });

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
