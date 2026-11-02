import { DomainRuleError } from './errors';

export type VehicleType = 'moto' | 'bicicleta_electrica' | 'van_carga' | 'camion_ligero';

export interface Courier {
  id: string;
  codigo: string;
  nombre: string;
  telefono: string;
  vehiculo: VehicleType;
  placa: string;
  enTurno: boolean;
  cargaActual: number;
  capacidadMaxima: number;
  lat: number;
  lng: number;
  ultimoReporteGps: string;
  zonaBase: string;
  calificacion: number;
  entregasHoy: number;
  usuarioPerfilId?: string;
}

export interface GpsTracePoint {
  id: string;
  domiciliarioId: string;
  pedidoId?: string | null;
  lat: number;
  lng: number;
  velocidadKmh: number;
  bateriaPct: number;
  registradoEn: string;
}

/**
 * Regla de dominio: la ubicación GPS de un domiciliario se marca como
 * desactualizada después de 10 minutos sin reporte.
 */
export const STALE_LOCATION_THRESHOLD_MINUTES = 10;
export const STALE_LOCATION_THRESHOLD_MS = STALE_LOCATION_THRESHOLD_MINUTES * 60 * 1000;

export function isCourierLocationStale(
  ultimoReporteGpsIso: string | null | undefined,
  nowMs: number = Date.now(),
  maxMinutes: number = STALE_LOCATION_THRESHOLD_MINUTES
): boolean {
  if (!ultimoReporteGpsIso) return true;
  const reportedMs = new Date(ultimoReporteGpsIso).getTime();
  if (Number.isNaN(reportedMs)) return true;
  return nowMs - reportedMs > maxMinutes * 60 * 1000;
}

export function getMinutesSinceLastGps(
  ultimoReporteGpsIso: string | null | undefined,
  nowMs: number = Date.now()
): number {
  if (!ultimoReporteGpsIso) return 999;
  const reportedMs = new Date(ultimoReporteGpsIso).getTime();
  if (Number.isNaN(reportedMs)) return 999;
  return Math.max(0, Math.round((nowMs - reportedMs) / 60000));
}

export function hasFreeCapacity(courier: Pick<Courier, 'cargaActual' | 'capacidadMaxima'>): boolean {
  return courier.cargaActual >= 0 && courier.cargaActual < courier.capacidadMaxima;
}

export function getFreeSlots(courier: Pick<Courier, 'cargaActual' | 'capacidadMaxima'>): number {
  return Math.max(0, courier.capacidadMaxima - courier.cargaActual);
}

export interface CourierEligibilityEvaluation {
  eligible: boolean;
  enTurno: boolean;
  tieneCupoLibre: boolean;
  ubicacionDesactualizada: boolean;
  cuposDisponibles: number;
  minutosDesdeUltimoGps: number;
  motivoRechazo?: string;
  codigoRechazo?: 'COURIER_OFF_SHIFT' | 'COURIER_NO_CAPACITY' | 'COURIER_LOCATION_STALE';
}

export function evaluateCourierForAssignment(
  courier: Courier,
  nowMs: number = Date.now(),
  requireFreshLocation: boolean = true
): CourierEligibilityEvaluation {
  const tieneCupoLibre = hasFreeCapacity(courier);
  const ubicacionDesactualizada = isCourierLocationStale(courier.ultimoReporteGps, nowMs);
  const minutosDesdeUltimoGps = getMinutesSinceLastGps(courier.ultimoReporteGps, nowMs);
  const cuposDisponibles = getFreeSlots(courier);

  if (!courier.enTurno) {
    return {
      eligible: false,
      enTurno: false,
      tieneCupoLibre,
      ubicacionDesactualizada,
      cuposDisponibles,
      minutosDesdeUltimoGps,
      codigoRechazo: 'COURIER_OFF_SHIFT',
      motivoRechazo: `El domiciliario ${courier.nombre} está fuera de turno.`,
    };
  }

  if (!tieneCupoLibre) {
    return {
      eligible: false,
      enTurno: true,
      tieneCupoLibre: false,
      ubicacionDesactualizada,
      cuposDisponibles: 0,
      minutosDesdeUltimoGps,
      codigoRechazo: 'COURIER_NO_CAPACITY',
      motivoRechazo: `El domiciliario ${courier.nombre} no tiene cupo libre (${courier.cargaActual}/${courier.capacidadMaxima}).`,
    };
  }

  if (requireFreshLocation && ubicacionDesactualizada) {
    return {
      eligible: false,
      enTurno: true,
      tieneCupoLibre: true,
      ubicacionDesactualizada: true,
      cuposDisponibles,
      minutosDesdeUltimoGps,
      codigoRechazo: 'COURIER_LOCATION_STALE',
      motivoRechazo: `Ubicación GPS desactualizada (${minutosDesdeUltimoGps} min > ${STALE_LOCATION_THRESHOLD_MINUTES} min).`,
    };
  }

  return {
    eligible: true,
    enTurno: true,
    tieneCupoLibre: true,
    ubicacionDesactualizada,
    cuposDisponibles,
    minutosDesdeUltimoGps,
  };
}

export function assertCourierCanBeAssigned(
  courier: Courier,
  nowMs: number = Date.now(),
  requireFreshLocation: boolean = true
): void {
  const evaluation = evaluateCourierForAssignment(courier, nowMs, requireFreshLocation);
  if (!evaluation.eligible && evaluation.codigoRechazo) {
    throw new DomainRuleError(
      evaluation.codigoRechazo,
      evaluation.motivoRechazo ?? 'El domiciliario no cumple las reglas de asignación.',
      { courierId: courier.id, evaluation }
    );
  }
}

export function reserveCourierSlotDomain(courier: Courier): Courier {
  if (!courier.enTurno) {
    throw new DomainRuleError('COURIER_OFF_SHIFT', `El domiciliario ${courier.nombre} no está en turno.`);
  }
  if (courier.cargaActual >= courier.capacidadMaxima) {
    throw new DomainRuleError(
      'COURIER_NO_CAPACITY',
      `La carga del domiciliario ${courier.nombre} (${courier.cargaActual}) no puede superar su capacidad máxima (${courier.capacidadMaxima}).`
    );
  }
  return {
    ...courier,
    cargaActual: courier.cargaActual + 1,
  };
}

export function releaseCourierSlotDomain(courier: Courier, completedDelivery: boolean = false): Courier {
  return {
    ...courier,
    cargaActual: Math.max(0, courier.cargaActual - 1),
    entregasHoy: completedDelivery ? courier.entregasHoy + 1 : courier.entregasHoy,
  };
}

/**
 * Fórmula de Haversine para calcular distancia geodésica en kilómetros
 * entre dos puntos (lat, lng).
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export function estimateEtaMinutes(distanceKm: number, vehicle: VehicleType): number {
  const avgSpeedKmhMap: Record<VehicleType, number> = {
    moto: 28,
    bicicleta_electrica: 18,
    van_carga: 22,
    camion_ligero: 19,
  };
  const speed = avgSpeedKmhMap[vehicle] ?? 24;
  return Math.max(4, Math.round((distanceKm / speed) * 60 + 3));
}
