import {
  DomainRuleError,
  type Courier,
  type Distributor,
  type GpsTracePoint,
  type Order,
  type OrderEvent,
  type UserProfile,
} from '../domain';
import type {
  ApplicationPorts,
  ClockPort,
  CourierRepositoryPort,
  DistributorRepositoryPort,
  GpsTraceRepositoryPort,
  OrderEventRepositoryPort,
  OrderRepositoryPort,
  ProfileRepositoryPort,
} from '../application';
import { createInitialBogotaSeed, type RutaClaraSnapshot } from './bogotaDemoSeed';

const STORAGE_KEY = 'rutaclara_enterprise_state_v1';

export class TransactionalRutaClaraStore {
  private state: RutaClaraSnapshot;

  constructor(initialState?: RutaClaraSnapshot) {
    this.state = initialState ?? this.loadInitialState();
  }

  private loadInitialState(): RutaClaraSnapshot {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as RutaClaraSnapshot;
          if (parsed && Array.isArray(parsed.orders) && parsed.orders.length > 0) {
            return parsed;
          }
        }
      } catch {
        // Fallback to seed
      }
    }
    return createInitialBogotaSeed();
  }

  private persist(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch {
        // Ignore storage quota errors
      }
    }
  }

  public getSnapshot(): RutaClaraSnapshot {
    return structuredClone(this.state);
  }

  public replaceSnapshot(snapshot: RutaClaraSnapshot): void {
    this.state = structuredClone(snapshot);
    this.persist();
  }

  public resetToBogotaSeed(): RutaClaraSnapshot {
    this.state = createInitialBogotaSeed();
    this.persist();
    return this.getSnapshot();
  }

  public createPorts(clock?: ClockPort): ApplicationPorts {
    const store = this;

    const systemClock: ClockPort = clock ?? {
      nowIso: () => new Date().toISOString(),
      nowMs: () => Date.now(),
    };

    const orders: OrderRepositoryPort = {
      async findById(id: string) {
        const found = store.state.orders.find((o) => o.id === id || o.codigo === id);
        return found ? structuredClone(found) : null;
      },
      async listAll() {
        return structuredClone(store.state.orders);
      },
      async listByDistributor(distribuidorId: string) {
        return structuredClone(store.state.orders.filter((o) => o.distribuidorId === distribuidorId));
      },
      async listByCourier(domiciliarioId: string) {
        return structuredClone(store.state.orders.filter((o) => o.domiciliarioId === domiciliarioId));
      },
      async create(order: Order) {
        store.state.orders.unshift(structuredClone(order));
        store.persist();
        return structuredClone(order);
      },
      async updateWithVersion(order: Order, expectedVersion: number) {
        const index = store.state.orders.findIndex((o) => o.id === order.id);
        if (index === -1) {
          throw new DomainRuleError('ENTITY_NOT_FOUND', `Pedido '${order.id}' no existe en persistencia.`);
        }
        const current = store.state.orders[index];
        if (current.version !== expectedVersion) {
          throw new DomainRuleError(
            'CONCURRENCY_CONFLICT',
            `Conflicto de concurrencia optimista al guardar ${order.codigo}: versión en base v${current.version} != esperada v${expectedVersion}.`,
            { currentVersion: current.version, expectedVersion }
          );
        }
        store.state.orders[index] = structuredClone(order);
        store.persist();
        return structuredClone(order);
      },
    };

    const couriers: CourierRepositoryPort = {
      async findById(id: string) {
        const found = store.state.couriers.find((c) => c.id === id || c.codigo === id);
        return found ? structuredClone(found) : null;
      },
      async listAll() {
        return structuredClone(store.state.couriers);
      },
      async create(courier: Courier) {
        if (courier.cargaActual < 0 || courier.cargaActual > courier.capacidadMaxima) {
          throw new DomainRuleError(
            'COURIER_LOAD_INVALID',
            'Violación de restricción CHECK: carga_actual fuera del rango [0, capacidad_maxima].'
          );
        }
        store.state.couriers.push(structuredClone(courier));
        store.persist();
        return structuredClone(courier);
      },
      async update(courier: Courier) {
        if (courier.cargaActual < 0 || courier.cargaActual > courier.capacidadMaxima) {
          throw new DomainRuleError(
            'COURIER_LOAD_INVALID',
            'Violación de restricción CHECK: la carga de un domiciliario no puede superar su capacidad.'
          );
        }
        const index = store.state.couriers.findIndex((c) => c.id === courier.id);
        if (index === -1) {
          throw new DomainRuleError('ENTITY_NOT_FOUND', `Domiciliario '${courier.id}' no encontrado.`);
        }
        store.state.couriers[index] = structuredClone(courier);
        store.persist();
        return structuredClone(courier);
      },
      async tryReserveSlot(courierId: string) {
        const index = store.state.couriers.findIndex((c) => c.id === courierId);
        if (index === -1) return null;
        const current = store.state.couriers[index];
        if (!current.enTurno || current.cargaActual >= current.capacidadMaxima) {
          return null;
        }
        const updated: Courier = {
          ...current,
          cargaActual: current.cargaActual + 1,
        };
        store.state.couriers[index] = updated;
        store.persist();
        return structuredClone(updated);
      },
      async releaseSlot(courierId: string, incrementDeliveredToday: boolean = false) {
        const index = store.state.couriers.findIndex((c) => c.id === courierId);
        if (index === -1) return null;
        const current = store.state.couriers[index];
        const updated: Courier = {
          ...current,
          cargaActual: Math.max(0, current.cargaActual - 1),
          entregasHoy: incrementDeliveredToday ? current.entregasHoy + 1 : current.entregasHoy,
        };
        store.state.couriers[index] = updated;
        store.persist();
        return structuredClone(updated);
      },
    };

    const distributors: DistributorRepositoryPort = {
      async findById(id: string) {
        const found = store.state.distributors.find((d) => d.id === id || d.codigo === id);
        return found ? structuredClone(found) : null;
      },
      async listAll() {
        return structuredClone(store.state.distributors);
      },
      async create(distributor: Distributor) {
        store.state.distributors.push(structuredClone(distributor));
        store.persist();
        return structuredClone(distributor);
      },
      async update(distributor: Distributor) {
        const index = store.state.distributors.findIndex((d) => d.id === distributor.id);
        if (index === -1) {
          throw new DomainRuleError('ENTITY_NOT_FOUND', `Distribuidor '${distributor.id}' no encontrado.`);
        }
        store.state.distributors[index] = structuredClone(distributor);
        store.persist();
        return structuredClone(distributor);
      },
    };

    const events: OrderEventRepositoryPort = {
      async append(event: OrderEvent) {
        store.state.events.unshift(structuredClone(event));
        store.persist();
        return structuredClone(event);
      },
      async listByOrder(pedidoId: string) {
        return structuredClone(
          store.state.events
            .filter((e) => e.pedidoId === pedidoId)
            .sort((a, b) => new Date(b.ocurridoEn).getTime() - new Date(a.ocurridoEn).getTime())
        );
      },
      async listRecent(limit: number = 50) {
        return structuredClone(
          [...store.state.events]
            .sort((a, b) => new Date(b.ocurridoEn).getTime() - new Date(a.ocurridoEn).getTime())
            .slice(0, limit)
        );
      },
    };

    const gpsTraces: GpsTraceRepositoryPort = {
      async append(point: GpsTracePoint) {
        store.state.gpsTraces.push(structuredClone(point));
        store.persist();
        return structuredClone(point);
      },
      async listByCourier(domiciliarioId: string, limit: number = 25) {
        return structuredClone(
          store.state.gpsTraces
            .filter((t) => t.domiciliarioId === domiciliarioId)
            .sort((a, b) => new Date(a.registradoEn).getTime() - new Date(b.registradoEn).getTime())
            .slice(-limit)
        );
      },
      async listRecentAll(limit: number = 100) {
        return structuredClone(store.state.gpsTraces.slice(-limit));
      },
    };

    const profiles: ProfileRepositoryPort = {
      async findById(id: string) {
        const found = store.state.profiles.find((p) => p.id === id);
        return found ? structuredClone(found) : null;
      },
      async findByEmail(email: string) {
        const normalized = email.trim().toLowerCase();
        const found = store.state.profiles.find((p) => p.email.toLowerCase() === normalized);
        return found ? structuredClone(found) : null;
      },
      async listAll() {
        return structuredClone(store.state.profiles);
      },
      async save(profile: UserProfile) {
        const index = store.state.profiles.findIndex((p) => p.id === profile.id);
        if (index === -1) {
          store.state.profiles.push(structuredClone(profile));
        } else {
          store.state.profiles[index] = structuredClone(profile);
        }
        store.persist();
        return structuredClone(profile);
      },
    };

    return {
      orders,
      couriers,
      distributors,
      events,
      gpsTraces,
      profiles,
      clock: systemClock,
    };
  }
}

export const defaultRutaClaraStore = new TransactionalRutaClaraStore();
