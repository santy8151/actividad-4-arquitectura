import { handleRutaClaraApiRequest } from '../../core/infrastructure/httpApiHandler';

// Handler Serverless compatible con Netlify Functions v2
export default async (req: Request) => {
  const url = new URL(req.url);
  const headers: Record<string, string | undefined> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let body: unknown = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }
  }

  const result = await handleRutaClaraApiRequest({
    method: req.method,
    path: url.pathname,
    headers,
    body,
  });

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};
