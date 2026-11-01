export type ConnectionState = 'Conectando' | 'Conectado' | 'Desconectado' | 'Error de conexión';
export type DispatchState = 'IDLE' | 'VALIDATING' | 'SUBMITTING' | 'CONFIRMED' | 'DOMAIN_ERROR' | 'INTEGRATION_ERROR' | 'NETWORK_ERROR';

export interface HealthStatus {
  status: string;
  connected: boolean;
}

export interface DeliveryResponse {
  deliveryId: string;
  status: string;
  courierId?: string;
  version: number;
}

export interface OrderRecord {
  id: string;
  code: string;
  customer: string;
  city: string;
  total: number;
  status: string;
  lastMileStatus?: string;
  eta: string;
}

export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  price: number;
  stockPhysical: number;
  stockReserved: number;
  stockAvailable: number;
  minimumLevel: number;
}

export interface WarehouseRecord {
  id: string;
  name: string;
  city: string;
  address: string;
  capacity: number;
  occupancy: number;
  stock: number;
}

export interface CustomerRecord {
  id: string;
  name: string;
  document: string;
  city: string;
  email: string;
  phone: string;
  segment: string;
}

export interface IncidentRecord {
  id: string;
  code: string;
  type: string;
  priority: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  status: string;
  deliveryId?: string;
  owner: string;
}
