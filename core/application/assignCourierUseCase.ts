import {
  assertCourierCanBeAssigned,
  assignCourierToOrder,
  assertPermission,
  DomainRuleError,
  type Courier,
  type Order,
  type OrderEvent,
  type UserProfile,
} from '../domain';
import type {
  ClockPort,
  CourierRepositoryPort,
  OrderEventRepositoryPort,
  OrderRepositoryPort,
} from './ports';

export interface AssignCourierInput {
  pedidoId: string;
  domiciliarioId: string;
  expectedVersion?: number;
  allowStaleLocationOverride?: boolean;
  actor: Pick<UserProfile, 'id' | 'nombre' | 'rol'>;
}

export interface AssignCourierOutput {
  order: Order;
  courier: Courier;
  event: OrderEvent;
}

/**
 * Caso de uso: Asignar un domiciliario a un pedido pendiente.
 *
 * Cierra el riesgo de asignaciones simultáneas identificado en la Actividad 3:
 * 1. Valida permisos del actor y estado/versión del pedido.
 * 2. Valida reglas del domiciliario (en turno, cupo libre y ubicación GPS <= 10 min).
 * 3. Reserva el cupo del domiciliario de forma ATÓMICA (`tryReserveSlot`).
 * 4. Transiciona el pedido a `asignado` aumentando su `version` y guarda en la bitácora.
 * 5. COMPENSACIÓN: Si falla el guardado del pedido (p. ej. conflicto de versión simultánea)
 *    o el registro del evento, libera inmediatamente el cupo reservado (`releaseSlot`).
 */
export class AssignCourierUseCase {
  constructor(
    private readonly deps: {
      orders: OrderRepositoryPort;
      couriers: CourierRepositoryPort;
      events: OrderEventRepositoryPort;
      clock: ClockPort;
    }
  ) {}

  async execute(input: AssignCourierInput): Promise<AssignCourierOutput> {
    assertPermission(input.actor, 'orders:assign');

    const order = await this.deps.orders.findById(input.pedidoId);
    if (!order) {
      throw new DomainRuleError('ENTITY_NOT_FOUND', `No se encontró el pedido '${input.pedidoId}'.`);
    }

    if (input.expectedVersion !== undefined && order.version !== input.expectedVersion) {
      throw new DomainRuleError(
        'CONCURRENCY_CONFLICT',
        `El pedido ${order.codigo} fue modificado por otro operador (versión actual v${order.version}, esperada v${input.expectedVersion}).`,
        { currentVersion: order.version, expectedVersion: input.expectedVersion }
      );
    }

    if (order.estado !== 'pendiente' || order.domiciliarioId !== null) {
      throw new DomainRuleError(
        'ORDER_ALREADY_ASSIGNED',
        `El pedido ${order.codigo} ya no está pendiente (estado actual: '${order.estado}').`
      );
    }

    const courier = await this.deps.couriers.findById(input.domiciliarioId);
    if (!courier) {
      throw new DomainRuleError('ENTITY_NOT_FOUND', `No se encontró el domiciliario '${input.domiciliarioId}'.`);
    }

    assertCourierCanBeAssigned(
      courier,
      this.deps.clock.nowMs(),
      !input.allowStaleLocationOverride
    );

    // Paso atómico: reservar cupo del domiciliario antes de confirmar el pedido
    const reservedCourier = await this.deps.couriers.tryReserveSlot(courier.id);
    if (!reservedCourier) {
      throw new DomainRuleError(
        'COURIER_NO_CAPACITY',
        `Reserva atómica rechazada: el domiciliario ${courier.nombre} agotó su cupo disponible o salió de turno simultáneamente.`
      );
    }

    const versionBeforeUpdate = order.version;
    try {
      const nowIso = this.deps.clock.nowIso();
      const { updatedOrder, event } = assignCourierToOrder(
        order,
        reservedCourier.id,
        reservedCourier.nombre,
        input.actor,
        nowIso,
        versionBeforeUpdate
      );

      const savedOrder = await this.deps.orders.updateWithVersion(updatedOrder, versionBeforeUpdate);
      const savedEvent = await this.deps.events.append(event);

      return {
        order: savedOrder,
        courier: reservedCourier,
        event: savedEvent,
      };
    } catch (error) {
      // Compensación automática: liberar el cupo reservado si algo falla al actualizar el pedido o la bitácora
      await this.deps.couriers.releaseSlot(reservedCourier.id, false);
      throw error;
    }
  }
}
