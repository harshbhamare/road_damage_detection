import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import mediaRoutes from './routes/mediaRoutes';
import damageRoutes from './routes/damageRoutes';
import jobRoutes from './routes/jobRoutes';

export function createApp(): Application {
  const app = express();

  // Middlewares
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static uploads directory (allows client to view original road images)
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadDir));

  // Health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'OK',
      service: 'Road Damage Backend API',
      timestamp: new Date().toISOString()
    });
  });

  // API Routes
  app.use('/api/media', mediaRoutes);
  app.use('/api/damage', damageRoutes);
  app.use('/api/jobs', jobRoutes);

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Unhandled Error]', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error'
    });
  });

  return app;
}
