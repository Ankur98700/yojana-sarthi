import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from './server/db.ts';
import { createApiRouter } from './server/routes.ts';

export async function createServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';

  // Ensure DB is initialized and seeded on startup
  getDb();

  // Security headers & CORS
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  // Mount REST API
  app.use('/api', createApiRouter());

  // API 404 handler
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Global safe error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Server Error]', err.message);
    res.status(500).json({ error: 'An unexpected server error occurred. Please try again.' });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Production build not found. Run npm run build first.');
      }
    });
  }

  return app;
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isMainModule) {
  const PORT = Number(process.env.PORT || 3000);
  createServer()
    .then((app) => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Yojana Sarthi server running at http://0.0.0.0:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start Yojana Sarthi server:', err);
      process.exit(1);
    });
}
