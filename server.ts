import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';

import { verifyToken } from './server/auth';
import { authRouter } from './server/routes/auth.routes';
import { orgRouter } from './server/routes/org.routes';
import { academicRouter } from './server/routes/academic.routes';
import { attendanceRouter, setAttendanceSocketIo } from './server/routes/attendance.routes';
import { feesRouter } from './server/routes/fees.routes';
import { gradesRouter } from './server/routes/grades.routes';
import { notificationsRouter, setNotificationsSocketIo } from './server/routes/notifications.routes';
import { aiRouter } from './server/routes/ai.routes';
import { systemRouter } from './server/routes/system.routes';
import { db } from './server/db';

dotenv.config();

async function startServer() {
  await db.initialize();
  const app = express();
  app.disable('x-powered-by');
  const PORT = Number(process.env.PORT || 3000);
  const allowedOrigins = (process.env.APP_ORIGIN || `http://localhost:${PORT}`).split(',').map((origin) => origin.trim()).filter(Boolean);
  const server = http.createServer(app);

  // Initialize Socket.io
  const io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  // Attach socket.io to router modules for real-time dispatch
  setAttendanceSocketIo(io);
  setNotificationsSocketIo(io);

  // Middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Authorization', 'Content-Type', 'X-Biometric-Gateway-Key'] }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Basic Security & CORS Headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Socket.io authentication and server-controlled tenant rooms.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const payload = typeof token === 'string' ? verifyToken(token) : null;
    if (!payload) return next(new Error('Authentication required'));
    (socket as any).user = payload;
    return next();
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    if (user) {
      // Join isolated rooms
      if (user.org_id) {
        socket.join(`room:org_${user.org_id}`);
      }
      if (user.userId) {
        socket.join(`room:user_${user.userId}`);
      }
      if (user.batch_id) {
        socket.join(`room:batch_${user.batch_id}`);
      }
      console.log(`[Socket.io] User ${user.email} (${user.role}) connected and joined rooms.`);
    }

    socket.on('disconnect', () => {
      // socket disconnect
    });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/org', orgRouter);
  app.use('/api/academic', academicRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/fees', feesRouter);
  app.use('/api/grades', gradesRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/system', systemRouter);

  // Global JSON Error Handler (Layer 8)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[API Error]:', err);
    res.status(err.status || 500).json({
      error: err.name || 'InternalServerError',
      message: err.message || 'An unexpected error occurred processing the request.',
      timestamp: new Date().toISOString(),
    });
  });

  // Vite middleware for development vs static for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ERP Backend & WebSockets running at http://0.0.0.0:${PORT}`);
  });

  const shutdown = async () => { await db.close(); server.close(); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start ERP Server:', err);
});
