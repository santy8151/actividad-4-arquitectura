const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5261';

export class ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status?: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${DEFAULT_API_BASE_URL}${url}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload?.detail ?? payload?.title ?? 'La operación falló';
    const code = typeof payload === 'object' && payload && 'code' in payload ? String((payload as any).code) : undefined;
    throw new ApiError(message, response.status, code, payload);
  }

  return payload as T;
}

export const lastMileClient = {
  async getHealth() {
    return request<{ status: string; connected: boolean }>(`/health`);
  },

  async getDelivery(deliveryId: string) {
    return request<{ deliveryId: string; status: string; courierId?: string; version: number }>(`/api/deliveries/${deliveryId}`);
  },

  async assignCourier(deliveryId: string, courierId: string) {
    return request<{ deliveryId: string; courierId: string; status: string }>(`/api/deliveries/${deliveryId}/courier-assignment`, {
      method: 'POST',
      body: JSON.stringify({ courierId })
    });
  }
};

export { DEFAULT_API_BASE_URL };
