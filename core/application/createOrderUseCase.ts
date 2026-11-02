import {
  assertPermission,
  canDistributorDispatchOrders,
  createOrderEntity,
  DomainRuleError,
  type Order,
  type OrderEvent,
  type OrderPriority,
  type UserProfile,
} from '../domain';
import type {
  ClockPort,
  DistributorRepositoryPort,
  OrderEventRepositoryPort,
  OrderRepositoryPort,
} from './ports';

export interface CreateOrderInput {
  id?: string;
  codigo?: string;
  distribuidorId: string;
  clienteNombre: string;
  clienteTelefono: string;
  direccionEntrega: string;
  localidad: string;
  destinoLat: number;
  destinoLng: number;
  itemsResumen: string;
  pesoTotalKg: number;
  valorTotalCop: number;
  prioridad?: OrderPriority;
  notas?: string;
  actor: Pick<UserProfile, 'id' | 'nombre' | 'rol' | 'distribuidorId'>;
}

export class CreateOrderUseCase {
  constructor(
    private readonly deps: {
      orders: OrderRepositoryPort;
      distributors: DistributorRepositoryPort;
      events: OrderEventRepositoryPort;
      clock: ClockPort;
    }
  ) {}

  async execute(input: CreateOrderInput): Promise<{ order: Order; event: OrderEvent }> {
    assertPermission(input.actor, 'orders:create');

    if (
      input.actor.rol === 'distribuidor' &&
      input.actor.distribuidorId &&
      input.actor.distribuidorId !== input.distribuidorId
    ) {
      throw new DomainRuleError(
        'UNAUTHORIZED_ACTION',
        'Un usuario con perfil distribuidor solo puede crear pedidos desde su propio punto de distribución.'
      );
    }

    const distributor = await this.deps.distributors.findById(input.distribuidorId);
    if (!distributor) {
      throw new DomainRuleError(
        'ENTITY_NOT_FOUND',
        `El punto de distribución '${input.distribuidorId}' no existe.`
      );
    }

    if (!canDistributorDispatchOrders(distributor)) {
      throw new DomainRuleError(
        'DISTRIBUTOR_NOT_ACTIVE',
        `El distribuidor '${distributor.nombre}' está en etapa comercial '${distributor.etapaComercial}' y no tiene despacho habilitado.`
      );
    }

    const allOrders = await this.deps.orders.listAll();
    const nextNumber = allOrders.length + 101;
    const id = input.id ?? `ped-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const codigo = input.codigo ?? `RC-BOG-${nextNumber}`;
    const nowIso = this.deps.clock.nowIso();

    const { order, event } = createOrderEntity({
      id,
      codigo,
      distribuidorId: distributor.id,
      clienteNombre: input.clienteNombre,
      clienteTelefono: input.clienteTelefono,
      direccionEntrega: input.direccionEntrega,
      localidad: input.localidad,
      origenLat: distributor.lat,
      origenLng: distributor.lng,
      destinoLat: input.destinoLat,
      destinoLng: input.destinoLng,
      itemsResumen: input.itemsResumen,
      pesoTotalKg: input.pesoTotalKg,
      valorTotalCop: input.valorTotalCop,
      prioridad: input.prioridad,
      notas: input.notas,
      actorId: input.actor.id,
      actorNombre: input.actor.nombre,
      actorRol: input.actor.rol,
      nowIso,
    });

    const savedOrder = await this.deps.orders.create(order);
    const savedEvent = await this.deps.events.append(event);

    await this.deps.distributors.update({
      ...distributor,
      pedidosMesActual: distributor.pedidosMesActual + 1,
      inventarioDisponibleUnidades: Math.max(0, distributor.inventarioDisponibleUnidades - 1),
      actualizadoEn: nowIso,
    });

    return { order: savedOrder, event: savedEvent };
  }
}
