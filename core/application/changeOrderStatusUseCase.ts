import {
  DomainRuleError,
  hasPermission,
  transitionOrderState,
  type Courier,
  type Order,
  type OrderEvent,
  type OrderStatus,
  type UserProfile,
} from '../domain';
import type {
  ClockPort,
  CourierRepositoryPort,
  OrderEventRepositoryPort,
  OrderRepositoryPort,
} from './ports';

export interface ChangeOrderStatusInput {
  pedidoId: string;
  nuevoEstado: OrderStatus;
  expectedVersion?: number;
  detalle?: string;
  actor: Pick<UserProfile, 'id' | 'nombre' | 'rol' | 'domiciliarioId'>;
}

export class ChangeOrderStatusUseCase {
  constructor(
    private readonly deps: {
      orders: OrderRepositoryPort;
      couriers: CourierRepositoryPort;
      events: OrderEventRepositoryPort;
      clock: ClockPort;
    }
  ) {}

  async execute(input: ChangeOrderStatusInput): Promise<{
    order: Order;
    event: OrderEvent;
    updatedCourier: Courier | null;
  }> {
    if (input.actor.rol === 'pendiente') {
      throw new DomainRuleError(
        'ACCOUNT_PENDING_APPROVAL',
        'Su cuenta está pendiente de aprobación y no puede modificar estados de pedidos.'
      );
    }

    const canTransitionAny = hasPermission(input.actor.rol, 'orders:transition_any');
    const canTransitionAssigned = hasPermission(input.actor.rol, 'orders:transition_assigned');

    if (!canTransitionAny && !canTransitionAssigned) {
      throw new DomainRuleError(
        'UNAUTHORIZED_ACTION',
        `El perfil '${input.actor.rol}' no tiene permisos para cambiar el estado de un pedido.`
      );
    }

    const order = await this.deps.orders.findById(input.pedidoId);
    if (!order) {
      throw new DomainRuleError('ENTITY_NOT_FOUND', `No se encontró el pedido '${input.pedidoId}'.`);
    }

    if (!canTransitionAny && canTransitionAssigned) {
      if (input.actor.domiciliarioId && order.domiciliarioId !== input.actor.domiciliarioId) {
        throw new DomainRuleError(
          'UNAUTHORIZED_ACTION',
          'Un domiciliario únicamente puede cambiar el estado de los pedidos asignados a su propio turno.'
        );
      }
      if (input.nuevoEstado === 'cancelado' || input.nuevoEstado === 'pendiente') {
        throw new DomainRuleError(
          'UNAUTHORIZED_ACTION',
          'Solo Operaciones o Administración pueden cancelar o desasignar un pedido.'
        );
      }
    }

    const versionBefore = order.version;
    const nowIso = this.deps.clock.nowIso();

    const { updatedOrder, event, releasedCourierId } = transitionOrderState(
      order,
      input.nuevoEstado,
      input.actor,
      nowIso,
      {
        expectedVersion: input.expectedVersion,
        detalle: input.detalle,
      }
    );

    const savedOrder = await this.deps.orders.updateWithVersion(updatedOrder, versionBefore);
    const savedEvent = await this.deps.events.append(event);

    let updatedCourier: Courier | null = null;
    if (releasedCourierId) {
      updatedCourier = await this.deps.couriers.releaseSlot(
        releasedCourierId,
        input.nuevoEstado === 'entregado'
      );
    }

    return {
      order: savedOrder,
      event: savedEvent,
      updatedCourier,
    };
  }
}
