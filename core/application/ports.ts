import type {
  Courier,
  Distributor,
  GpsTracePoint,
  Order,
  OrderEvent,
  UserProfile,
} from '../domain';

export interface OrderRepositoryPort {
  findById(id: string): Promise<Order | null>;
  listAll(): Promise<Order[]>;
  listByDistributor(distribuidorId: string): Promise<Order[]>;
  listByCourier(domiciliarioId: string): Promise<Order[]>;
  create(order: Order): Promise<Order>;
  /**
   * Guarda el pedido verificando control de concurrencia optimista (expectedVersion).
   * Lanza DomainRuleError('CONCURRENCY_CONFLICT') si la versión en base de datos cambió.
   */
  updateWithVersion(order: Order, expectedVersion: number): Promise<Order>;
}

export interface CourierRepositoryPort {
  findById(id: string): Promise<Courier | null>;
  listAll(): Promise<Courier[]>;
  create(courier: Courier): Promise<Courier>;
  update(courier: Courier): Promise<Courier>;
  /**
   * Reserva atómicamente 1 cupo del domiciliario (UPDATE ... SET current_load = current_load + 1
   * WHERE id = $1 AND on_shift = true AND current_load < max_capacity).
   * Retorna el domiciliario actualizado o null si no fue posible reservar el cupo atómicamente.
   */
  tryReserveSlot(courierId: string): Promise<Courier | null>;
  /**
   * Libera atómicamente 1 cupo previamente reservado (compensación ante fallo o fin de entrega).
   */
  releaseSlot(courierId: string, incrementDeliveredToday?: boolean): Promise<Courier | null>;
}

export interface DistributorRepositoryPort {
  findById(id: string): Promise<Distributor | null>;
  listAll(): Promise<Distributor[]>;
  create(distributor: Distributor): Promise<Distributor>;
  update(distributor: Distributor): Promise<Distributor>;
}

export interface OrderEventRepositoryPort {
  append(event: OrderEvent): Promise<OrderEvent>;
  listByOrder(pedidoId: string): Promise<OrderEvent[]>;
  listRecent(limit?: number): Promise<OrderEvent[]>;
}

export interface GpsTraceRepositoryPort {
  append(point: GpsTracePoint): Promise<GpsTracePoint>;
  listByCourier(domiciliarioId: string, limit?: number): Promise<GpsTracePoint[]>;
  listRecentAll(limit?: number): Promise<GpsTracePoint[]>;
}

export interface ProfileRepositoryPort {
  findById(id: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  listAll(): Promise<UserProfile[]>;
  save(profile: UserProfile): Promise<UserProfile>;
}

export interface ClockPort {
  nowIso(): string;
  nowMs(): number;
}

export interface ApplicationPorts {
  orders: OrderRepositoryPort;
  couriers: CourierRepositoryPort;
  distributors: DistributorRepositoryPort;
  events: OrderEventRepositoryPort;
  gpsTraces: GpsTraceRepositoryPort;
  profiles: ProfileRepositoryPort;
  clock: ClockPort;
}
