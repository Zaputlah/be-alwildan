import type { Request, Response } from 'express';
import { createApp } from '../src/app.js';

// Vercel invokes the exported Express application as a serverless function.
// The local `src/server.ts` entrypoint remains responsible for app.listen().
const app = createApp();

export default function handler(req: Request, res: Response) {
  // Vercel may strip `/api` before invoking an api function. Keep the
  // original application routes (`/api/v1/...`) working in both cases.
  if (req.url && !req.url.startsWith('/api/')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return app(req, res);
}
