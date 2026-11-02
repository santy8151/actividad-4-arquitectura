import { DomainRuleError } from './errors';
import type { UserRole } from './profile';

export type OrderStatus =
  | 'pendiente'
  | 'asignado'
  | 'en_ruta'
  | 'entregado'
  | 'fallido'
  | 'cancelado';

export type OrderPriority = 'baja' | 'normal' | 'alta' | 'urgente';

export interface OrderItem {
  sku: string;
  nombre: string;
  cantidad: number;
  pesoKg: number;
  precioUnitarioCop: number;
}

export interface Order {
  id: string;
  codigo: string;
  distribuidorId: string;
  domiciliarioId: string | null;
  clienteNombre: string;
  clienteTelefono: string;
  direccionEntrega: string;
  localidad: string;
  origenLat: number;
  origenLng: number;
  destinoLat: number;
  destinoLng: number;
  itemsResumen: string;
  pesoTotalKg: number;
  valorTotalCop: number;
  prioridad: OrderPriority;
  estado: OrderStatus;
  version: number;
  notas?: string;
  motivoFallo?: string;
  creadoEn: string;
  actualizadoEn: string;
  asignadoEn?: string | null;
  enRutaEn?: string | null;
  finalizadoEn?: string | null;
}

export type OrderEventType =
  | 'PEDIDO_CREADO'
  | 'DOMICILIARIO_ASIGNADO'
  | 'SALIDA_A_RUTA'
  | 'PEDIDO_ENTREGADO'
  | 'ENTREGA_FALLIDA'
  | 'PEDIDO_CANCELADO'
  | 'PEDIDO_REASIGNADO';

export interface OrderEvent {
  id: string;
  pedidoId: string;
  tipo: OrderEventType;
  estadoAnterior: OrderStatus | null;
  estadoNuevo: OrderStatus;
  versionPedido: number;
  actorId: string;
  actorNombre: string;
  actorRol: UserRole;
  domiciliarioId?: string | null;
  descripcion: string;
  ocurridoEn: string;
}

/**
 * Máquina de estados explícita del Pedido:
 * pendiente → asignado → en_ruta → entregado | fallido, más cancelado.
 */
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pendiente: ['asignado', 'cancelado'],
  asignado: ['en_ruta', 'pendiente', 'cancelado'],
  en_ruta: ['entregado', 'fallido', 'cancelado'],
  entregado: [],
  fallido: [],
  cancelado: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return status === 'entregado' || status === 'fallido' || status === 'cancelado';
}

export function occupiesCourierSlot(status: OrderStatus): boolean {
  return status === 'asignado' || status === 'en_ruta';
}

export interface CreateOrderProps {
  id: string;
  codigo: string;
  distribuidorId: string;
  clienteNombre: string;
  clienteTelefono: string;
  direccionEntrega: string;
  localidad: string;
  origenLat: number;
  origenLng: number;
  destinoLat: number;
  destinoLng: number;
  itemsResumen: string;
  pesoTotalKg: number;
  valorTotalCop: number;
  prioridad?: OrderPriority;
  notas?: string;
  actorId: string;
  actorNombre: string;
  actorRol: UserRole;
  nowIso: string;
}

export function createOrderEntity(props: CreateOrderProps): { order: Order; event: OrderEvent } {
  if (!props.id.trim()) {
    throw new DomainRuleError('INVALID_ORDER_DATA', 'El identificador del pedido es obligatorio.');
  }
  if (!props.distribuidorId.trim()) {
    throw new DomainRuleError('INVALID_ORDER_DATA', 'Todo pedido debe estar asociado a un punto de distribución.');
  }
  if (!props.clienteNombre.trim() || !props.direccionEntrega.trim()) {
    throw new DomainRuleError('INVALID_ORDER_DATA', 'El nombre del cliente y la dirección de entrega son obligatorios.');
  }
  if (props.pesoTotalKg <= 0) {
    throw new DomainRuleError('INVALID_ORDER_DATA', 'El peso del pedido debe ser mayor a 0 kg.');
  }

  const order: Order = {
    id: props.id,
    codigo: props.codigo,
    distribuidorId: props.distribuidorId,
    domiciliarioId: null,
    clienteNombre: props.clienteNombre.trim(),
    clienteTelefono: props.clienteTelefono.trim(),
    direccionEntrega: props.direccionEntrega.trim(),
    localidad: props.localidad.trim() || 'Chapinero',
    origenLat: props.origenLat,
    origenLng: props.origenLng,
    destinoLat: props.destinoLat,
    destinoLng: props.destinoLng,
    itemsResumen: props.itemsResumen.trim(),
    pesoTotalKg: props.pesoTotalKg,
    valorTotalCop: props.valorTotalCop,
    prioridad: props.prioridad ?? 'normal',
    estado: 'pendiente',
    version: 1,
    notas: props.notas,
    creadoEn: props.nowIso,
    actualizadoEn: props.nowIso,
    asignadoEn: null,
    enRutaEn: null,
    finalizadoEn: null,
  };

  const event: OrderEvent = {
    id: `evt-${props.id}-v1`,
    pedidoId: order.id,
    tipo: 'PEDIDO_CREADO',
    estadoAnterior: null,
    estadoNuevo: 'pendiente',
    versionPedido: 1,
    actorId: props.actorId,
    actorNombre: props.actorNombre,
    actorRol: props.actorRol,
    domiciliarioId: null,
    descripcion: `Pedido ${order.codigo} creado para ${order.clienteNombre} (${order.direccionEntrega}).`,
    ocurridoEn: props.nowIso,
  };

  return { order, event };
}

export function assignCourierToOrder(
  order: Order,
  courierId: string,
  courierNombre: string,
  actor: { id: string; nombre: string; rol: UserRole },
  nowIso: string,
  expectedVersion?: number
): { updatedOrder: Order; event: OrderEvent } {
  if (!courierId.trim()) {
    throw new DomainRuleError('INVALID_ORDER_DATA', 'El identificador del domiciliario es obligatorio.');
  }

  if (expectedVersion !== undefined && order.version !== expectedVersion) {
    throw new DomainRuleError(
      'CONCURRENCY_CONFLICT',
      `Conflicto de concurrencia: el pedido ${order.codigo} está en versión v${order.version}, pero se esperaba v${expectedVersion}.`,
      { currentVersion: order.version, expectedVersion }
    );
  }

  if (order.estado !== 'pendiente' || order.domiciliarioId !== null) {
    throw new DomainRuleError(
      'ORDER_ALREADY_ASSIGNED',
      `El pedido ${order.codigo} no puede asignarse porque su estado actual es '${order.estado}'.`
    );
  }

  if (!canTransitionOrder(order.estado, 'asignado')) {
    throw new DomainRuleError(
      'INVALID_STATE_TRANSITION',
      `Transición inválida de '${order.estado}' a 'asignado'.`
    );
  }

  const nextVersion = order.version + 1;
  const updatedOrder: Order = {
    ...order,
    domiciliarioId: courierId,
    estado: 'asignado',
    version: nextVersion,
    asignadoEn: nowIso,
    actualizadoEn: nowIso,
  };

  const event: OrderEvent = {
    id: `evt-${order.id}-v${nextVersion}`,
    pedidoId: order.id,
    tipo: 'DOMICILIARIO_ASIGNADO',
    estadoAnterior: order.estado,
    estadoNuevo: 'asignado',
    versionPedido: nextVersion,
    actorId: actor.id,
    actorNombre: actor.nombre,
    actorRol: actor.rol,
    domiciliarioId: courierId,
    descripcion: `Domiciliario ${courierNombre} asignado con reserva atómica de cupo (v${nextVersion}).`,
    ocurridoEn: nowIso,
  };

  return { updatedOrder, event };
}

export function transitionOrderState(
  order: Order,
  targetStatus: OrderStatus,
  actor: { id: string; nombre: string; rol: UserRole },
  nowIso: string,
  options?: {
    expectedVersion?: number;
    detalle?: string;
  }
): { updatedOrder: Order; event: OrderEvent; releasedCourierId: string | null } {
  if (options?.expectedVersion !== undefined && order.version !== options.expectedVersion) {
    throw new DomainRuleError(
      'CONCURRENCY_CONFLICT',
      `Conflicto de versión simultánea en pedido ${order.codigo}: actual v${order.version} vs esperada v${options.expectedVersion}.`,
      { currentVersion: order.version, expectedVersion: options.expectedVersion }
    );
  }

  if (!canTransitionOrder(order.estado, targetStatus)) {
    throw new DomainRuleError(
      'INVALID_STATE_TRANSITION',
      `Transición no permitida en la máquina de estados: '${order.estado}' → '${targetStatus}'.`,
      { from: order.estado, to: targetStatus, allowed: VALID_ORDER_TRANSITIONS[order.estado] }
    );
  }

  if (targetStatus === 'fallido' && (!options?.detalle || !options.detalle.trim())) {
    throw new DomainRuleError(
      'INVALID_ORDER_DATA',
      'Para marcar un pedido como fallido es obligatorio registrar el motivo o incidencia.'
    );
  }

  const nextVersion = order.version + 1;
  const hadSlotOccupied = occupiesCourierSlot(order.estado);
  const willOccupySlot = occupiesCourierSlot(targetStatus);
  const releasedCourierId = hadSlotOccupied && !willOccupySlot ? order.domiciliarioId : null;

  const updatedOrder: Order = {
    ...order,
    estado: targetStatus,
    domiciliarioId: targetStatus === 'pendiente' ? null : order.domiciliarioId,
    version: nextVersion,
    motivoFallo: targetStatus === 'fallido' ? options?.detalle : order.motivoFallo,
    notas: options?.detalle ? `${order.notas ? order.notas + ' | ' : ''}${options.detalle}` : order.notas,
    actualizadoEn: nowIso,
    enRutaEn: targetStatus === 'en_ruta' ? nowIso : order.enRutaEn,
    finalizadoEn: isTerminalOrderStatus(targetStatus) ? nowIso : order.finalizadoEn,
  };

  const eventTypeMap: Record<OrderStatus, OrderEventType> = {
    pendiente: 'PEDIDO_REASIGNADO',
    asignado: 'DOMICILIARIO_ASIGNADO',
    en_ruta: 'SALIDA_A_RUTA',
    entregado: 'PEDIDO_ENTREGADO',
    fallido: 'ENTREGA_FALLIDA',
    cancelado: 'PEDIDO_CANCELADO',
  };

  const defaultDescMap: Record<OrderStatus, string> = {
    pendiente: 'Pedido devuelto a estado pendiente y cupo liberado.',
    asignado: 'Pedido asignado a domiciliario.',
    en_ruta: 'Domiciliario inició desplazamiento en ruta hacia el destino.',
    entregado: 'Entrega confirmada exitosamente en punto del cliente.',
    fallido: `Entrega marcada como fallida: ${options?.detalle ?? 'Incidencia reportada'}.`,
    cancelado: `Pedido cancelado${options?.detalle ? ': ' + options.detalle : '.'}`,
  };

  const event: OrderEvent = {
    id: `evt-${order.id}-v${nextVersion}`,
    pedidoId: order.id,
    tipo: eventTypeMap[targetStatus],
    estadoAnterior: order.estado,
    estadoNuevo: targetStatus,
    versionPedido: nextVersion,
    actorId: actor.id,
    actorNombre: actor.nombre,
    actorRol: actor.rol,
    domiciliarioId: order.domiciliarioId,
    descripcion: options?.detalle ? `${defaultDescMap[targetStatus]} (${options.detalle})` : defaultDescMap[targetStatus],
    ocurridoEn: nowIso,
  };

  return { updatedOrder, event, releasedCourierId };
}
