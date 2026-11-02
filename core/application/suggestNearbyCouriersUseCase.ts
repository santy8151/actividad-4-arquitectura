import {
  calculateDistanceKm,
  DomainRuleError,
  estimateEtaMinutes,
  evaluateCourierForAssignment,
  type Courier,
  type CourierEligibilityEvaluation,
} from '../domain';
import type { ClockPort, CourierRepositoryPort, OrderRepositoryPort } from './ports';

export interface CourierSuggestion {
  courier: Courier;
  evaluation: CourierEligibilityEvaluation;
  distanciaAOrigenKm: number;
  distanciaADestinoKm: number;
  recorridoTotalKm: number;
  etaMinutos: number;
  puntajeRecomendacion: number;
}

export class SuggestNearbyCouriersUseCase {
  constructor(
    private readonly deps: {
      orders: OrderRepositoryPort;
      couriers: CourierRepositoryPort;
      clock: ClockPort;
    }
  ) {}

  async execute(pedidoId: string): Promise<CourierSuggestion[]> {
    const order = await this.deps.orders.findById(pedidoId);
    if (!order) {
      throw new DomainRuleError('ENTITY_NOT_FOUND', `No se encontró el pedido '${pedidoId}'.`);
    }

    const couriers = await this.deps.couriers.listAll();
    const nowMs = this.deps.clock.nowMs();

    const suggestions: CourierSuggestion[] = couriers.map((courier) => {
      const evaluation = evaluateCourierForAssignment(courier, nowMs, true);
      const distanciaAOrigenKm = calculateDistanceKm(
        courier.lat,
        courier.lng,
        order.origenLat,
        order.origenLng
      );
      const distanciaOrigenADestinoKm = calculateDistanceKm(
        order.origenLat,
        order.origenLng,
        order.destinoLat,
        order.destinoLng
      );
      const distanciaADestinoKm = calculateDistanceKm(
        courier.lat,
        courier.lng,
        order.destinoLat,
        order.destinoLng
      );
      const recorridoTotalKm = Math.round((distanciaAOrigenKm + distanciaOrigenADestinoKm) * 100) / 100;
      const etaMinutos = estimateEtaMinutes(recorridoTotalKm, courier.vehiculo);

      // Cálculo de score (0 a 100): prioriza elegibilidad, cercanía al punto de recogida/destino y menor carga
      let puntaje = 100 - distanciaAOrigenKm * 8 - (courier.cargaActual / courier.capacidadMaxima) * 20;
      if (!evaluation.eligible) {
        puntaje -= 60;
      }
      puntaje = Math.max(5, Math.min(99, Math.round(puntaje)));

      return {
        courier,
        evaluation,
        distanciaAOrigenKm,
        distanciaADestinoKm,
        recorridoTotalKm,
        etaMinutos,
        puntajeRecomendacion: puntaje,
      };
    });

    return suggestions.sort((a, b) => {
      if (a.evaluation.eligible !== b.evaluation.eligible) {
        return a.evaluation.eligible ? -1 : 1;
      }
      if (a.distanciaAOrigenKm !== b.distanciaAOrigenKm) {
        return a.distanciaAOrigenKm - b.distanciaAOrigenKm;
      }
      return b.puntajeRecomendacion - a.puntajeRecomendacion;
    });
  }
}
