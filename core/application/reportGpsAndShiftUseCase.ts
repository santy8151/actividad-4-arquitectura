import {
  DomainRuleError,
  hasPermission,
  type Courier,
  type GpsTracePoint,
  type UserProfile,
} from '../domain';
import type {
  ClockPort,
  CourierRepositoryPort,
  GpsTraceRepositoryPort,
  OrderRepositoryPort,
} from './ports';

export interface ReportGpsInput {
  domiciliarioId: string;
  lat: number;
  lng: number;
  velocidadKmh?: number;
  bateriaPct?: number;
  pedidoId?: string | null;
  actor: Pick<UserProfile, 'id' | 'nombre' | 'rol' | 'domiciliarioId'>;
}

export class ReportGpsLocationUseCase {
  constructor(
    private readonly deps: {
      couriers: CourierRepositoryPort;
      gpsTraces: GpsTraceRepositoryPort;
      clock: ClockPort;
    }
  ) {}

  async execute(input: ReportGpsInput): Promise<{ courier: Courier; trace: GpsTracePoint }> {
    const canManage = hasPermission(input.actor.rol, 'couriers:manage');
    const canShiftGps = hasPermission(input.actor.rol, 'couriers:shift_gps');
    if (!canManage && !canShiftGps) {
      throw new DomainRuleError(
        'UNAUTHORIZED_ACTION',
        `El perfil '${input.actor.rol}' no tiene permiso para reportar telemetría GPS.`
      );
    }

    if (
      input.actor.rol === 'domiciliario' &&
      input.actor.domiciliarioId &&
      input.actor.domiciliarioId !== input.domiciliarioId
    ) {
      throw new DomainRuleError(
        'UNAUTHORIZED_ACTION',
        'Un domiciliario solo puede reportar su propia ubicación GPS.'
      );
    }

    if (Number.isNaN(input.lat) || Number.isNaN(input.lng) || input.lat < -90 || input.lat > 90 || input.lng < -180 || input.lng > 180) {
      throw new DomainRuleError('INVALID_ORDER_DATA', 'Las coordenadas GPS reportadas son inválidas.');
    }

    const courier = await this.deps.couriers.findById(input.domiciliarioId);
    if (!courier) {
      throw new DomainRuleError('ENTITY_NOT_FOUND', `Domiciliario '${input.domiciliarioId}' no encontrado.`);
    }

    const nowIso = this.deps.clock.nowIso();
    const updatedCourier: Courier = {
      ...courier,
      lat: Math.round(input.lat * 100000) / 100000,
      lng: Math.round(input.lng * 100000) / 100000,
      ultimoReporteGps: nowIso,
    };

    const trace: GpsTracePoint = {
      id: `gps-${courier.id}-${Date.now()}`,
      domiciliarioId: courier.id,
      pedidoId: input.pedidoId ?? null,
      lat: updatedCourier.lat,
      lng: updatedCourier.lng,
      velocidadKmh: input.velocidadKmh ?? 26,
      bateriaPct: input.bateriaPct ?? 88,
      registradoEn: nowIso,
    };

    const savedCourier = await this.deps.couriers.update(updatedCourier);
    const savedTrace = await this.deps.gpsTraces.append(trace);

    return { courier: savedCourier, trace: savedTrace };
  }
}

export interface ToggleCourierShiftInput {
  domiciliarioId: string;
  enTurno: boolean;
  actor: Pick<UserProfile, 'id' | 'nombre' | 'rol' | 'domiciliarioId'>;
}

export class ToggleCourierShiftUseCase {
  constructor(
    private readonly deps: {
      couriers: CourierRepositoryPort;
      orders: OrderRepositoryPort;
      clock: ClockPort;
    }
  ) {}

  async execute(input: ToggleCourierShiftInput): Promise<Courier> {
    const canManage = hasPermission(input.actor.rol, 'couriers:manage');
    const canShiftGps = hasPermission(input.actor.rol, 'couriers:shift_gps');
    if (!canManage && !canShiftGps) {
      throw new DomainRuleError(
        'UNAUTHORIZED_ACTION',
        `El perfil '${input.actor.rol}' no tiene permisos para iniciar o terminar turno.`
      );
    }

    if (
      input.actor.rol === 'domiciliario' &&
      input.actor.domiciliarioId &&
      input.actor.domiciliarioId !== input.domiciliarioId
    ) {
      throw new DomainRuleError(
        'UNAUTHORIZED_ACTION',
        'Un domiciliario solo puede iniciar o finalizar su propio turno.'
      );
    }

    const courier = await this.deps.couriers.findById(input.domiciliarioId);
    if (!courier) {
      throw new DomainRuleError('ENTITY_NOT_FOUND', `Domiciliario '${input.domiciliarioId}' no encontrado.`);
    }

    if (!input.enTurno) {
      const courierOrders = await this.deps.orders.listByCourier(courier.id);
      const activeInRoute = courierOrders.filter((o) => o.estado === 'en_ruta');
      if (activeInRoute.length > 0) {
        throw new DomainRuleError(
          'COURIER_HAS_ACTIVE_ROUTE',
          `El domiciliario ${courier.nombre} tiene ${activeInRoute.length} pedido(s) actualmente 'en_ruta' y no puede cerrar turno hasta finalizarlos.`
        );
      }
    }

    const nowIso = this.deps.clock.nowIso();
    const updatedCourier: Courier = {
      ...courier,
      enTurno: input.enTurno,
      ultimoReporteGps: input.enTurno ? nowIso : courier.ultimoReporteGps,
    };

    return this.deps.couriers.update(updatedCourier);
  }
}
