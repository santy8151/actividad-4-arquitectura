import { handleRutaClaraApiRequest } from '../core/infrastructure/httpApiHandler';

// Handler Serverless compatible con Vercel Node.js Runtime
export default async function handler(req: {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}, res: {
  status: (code: number) => { json: (data: unknown) => void };
  setHeader: (name: string, value: string) => void;
}) {
  const flatHeaders: Record<string, string | undefined> = {};
  if (req.headers) {
    for (const [k, v] of Object.entries(req.headers)) {
      flatHeaders[k] = Array.isArray(v) ? v[0] : v;
    }
  }

  const response = await handleRutaClaraApiRequest({
    method: req.method ?? 'GET',
    path: req.url ?? '/api/health',
    headers: flatHeaders,
    body: req.body,
  });

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(response.status).json(response.body);
}
