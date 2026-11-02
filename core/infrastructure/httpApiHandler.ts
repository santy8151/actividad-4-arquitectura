import { DomainRuleError, type UserProfile } from '../domain';
import { buildRutaClaraUseCases } from './index';

const container = buildRutaClaraUseCases();

export interface UniversalHttpRequest {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  body?: unknown;
}

export interface UniversalHttpResponse {
  status: number;
  body: unknown;
}

async function resolveAuthenticatedActor(
  headers: Record<string, string | undefined>
): Promise<UserProfile> {
  const normalizedHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v) normalizedHeaders[k.toLowerCase()] = v;
  }

  const profileId = normalizedHeaders['x-rutaclara-profile-id'] || 'usr-operador';
  const found = await container.ports.profiles.findById(profileId);
  if (found) return found;

  const fallbackAll = await container.ports.profiles.listAll();
  return (
    fallbackAll[0] ?? {
      id: 'usr-operador',
      email: 'operador@rutaclara.co',
      nombre: 'Daniela Ospina (Torre de Control)',
      rol: 'operador',
      cargo: 'Coordinadora de Despacho',
      avatarColor: '#3b82f6',
      aprobado: true,
      ultimoAcceso: new Date().toISOString(),
    }
  );
}

export async function handleRutaClaraApiRequest(
  req: UniversalHttpRequest
): Promise<UniversalHttpResponse> {
  const method = req.method.toUpperCase();
  const cleanPath = req.path
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/\?.*$/, '')
    .replace(/\/+$/, '') || '/';

  try {
    // 1. Health Check
    if (method === 'GET' && (cleanPath === '/health' || cleanPath === '/api/health' || cleanPath === '/')) {
      return {
        status: 200,
        body: {
          status: 'healthy',
          connected: true,
          service: 'RutaClara CRM/ERP & LastMile API',
          architecture: 'Clean Architecture (core/domain → core/application → core/infrastructure → api)',
          timestamp: new Date().toISOString(),
        },
      };
    }

    const actor = await resolveAuthenticatedActor(req.headers);
    const payload = (typeof req.body === 'string' && req.body ? JSON.parse(req.body) : req.body ?? {}) as Record<
      string,
      unknown
    >;

    // 2. Snapshot completo
    if (method === 'GET' && cleanPath === '/api/state') {
      return {
        status: 200,
        body: {
          actor,
          snapshot: container.store.getSnapshot(),
        },
      };
    }

    // 3. Compatibilidad con Vertical Slice .NET: GET /api/deliveries/:id
    const deliveryMatch = cleanPath.match(/^\/api\/deliveries\/([^/]+)$/);
    if (method === 'GET' && deliveryMatch) {
      const deliveryId = decodeURIComponent(deliveryMatch[1]);
      const order = await container.ports.orders.findById(deliveryId);
      if (!order) {
        return { status: 404, body: { code: 'DeliveryNotFound' } };
      }
      return {
        status: 200,
        body: {
          deliveryId: order.id,
          status: order.estado === 'pendiente' ? 'Pending' : 'Assigned',
          estadoRutaClara: order.estado,
          courierId: order.domiciliarioId,
          version: order.version,
        },
      };
    }

    // 4. Compatibilidad con Vertical Slice .NET: POST /api/deliveries/:id/courier-assignment
    const assignSliceMatch = cleanPath.match(/^\/api\/deliveries\/([^/]+)\/courier-assignment$/);
    if (method === 'POST' && assignSliceMatch) {
      const deliveryId = decodeURIComponent(assignSliceMatch[1]);
      const courierId = String(payload.courierId ?? payload.domiciliarioId ?? '');
      const result = await container.assignCourier.execute({
        pedidoId: deliveryId,
        domiciliarioId: courierId,
        actor,
      });
      return {
        status: 200,
        body: {
          deliveryId: result.order.id,
          courierId: result.courier.id,
          status: 'Assigned',
          version: result.order.version,
          event: result.event,
        },
      };
    }

    // 5. Crear Pedido: POST /api/orders
    if (method === 'POST' && cleanPath === '/api/orders') {
      const result = await container.createOrder.execute({
        distribuidorId: String(payload.distribuidorId ?? ''),
        clienteNombre: String(payload.clienteNombre ?? ''),
        clienteTelefono: String(payload.clienteTelefono ?? ''),
        direccionEntrega: String(payload.direccionEntrega ?? ''),
        localidad: String(payload.localidad ?? 'Chapinero'),
        destinoLat: Number(payload.destinoLat ?? 4.65),
        destinoLng: Number(payload.destinoLng ?? -74.06),
        itemsResumen: String(payload.itemsResumen ?? ''),
        pesoTotalKg: Number(payload.pesoTotalKg ?? 1),
        valorTotalCop: Number(payload.valorTotalCop ?? 100000),
        prioridad: (payload.prioridad as 'baja' | 'normal' | 'alta' | 'urgente') ?? 'normal',
        notas: payload.notas ? String(payload.notas) : undefined,
        actor,
      });
      return { status: 201, body: result };
    }

    // 6. Sugerencias de domiciliarios cercanos: GET /api/orders/:id/suggestions
    const suggestionsMatch = cleanPath.match(/^\/api\/orders\/([^/]+)\/suggestions$/);
    if (method === 'GET' && suggestionsMatch) {
      const pedidoId = decodeURIComponent(suggestionsMatch[1]);
      const suggestions = await container.suggestNearbyCouriers.execute(pedidoId);
      return { status: 200, body: { suggestions } };
    }

    // 7. Asignar domiciliario con reserva atómica: POST /api/orders/:id/assign
    const assignMatch = cleanPath.match(/^\/api\/orders\/([^/]+)\/assign$/);
    if (method === 'POST' && assignMatch) {
      const pedidoId = decodeURIComponent(assignMatch[1]);
      const result = await container.assignCourier.execute({
        pedidoId,
        domiciliarioId: String(payload.domiciliarioId ?? ''),
        expectedVersion: payload.expectedVersion !== undefined ? Number(payload.expectedVersion) : undefined,
        allowStaleLocationOverride: Boolean(payload.allowStaleLocationOverride),
        actor,
      });
      return { status: 200, body: result };
    }

    // 8. Cambiar estado de pedido: POST /api/orders/:id/status
    const statusMatch = cleanPath.match(/^\/api\/orders\/([^/]+)\/status$/);
    if (method === 'POST' && statusMatch) {
      const pedidoId = decodeURIComponent(statusMatch[1]);
      const result = await container.changeOrderStatus.execute({
        pedidoId,
        nuevoEstado: payload.nuevoEstado as 'pendiente' | 'asignado' | 'en_ruta' | 'entregado' | 'fallido' | 'cancelado',
        expectedVersion: payload.expectedVersion !== undefined ? Number(payload.expectedVersion) : undefined,
        detalle: payload.detalle ? String(payload.detalle) : undefined,
        actor,
      });
      return { status: 200, body: result };
    }

    // 9. Reportar ubicación GPS: POST /api/couriers/:id/gps
    const gpsMatch = cleanPath.match(/^\/api\/couriers\/([^/]+)\/gps$/);
    if (method === 'POST' && gpsMatch) {
      const domiciliarioId = decodeURIComponent(gpsMatch[1]);
      const result = await container.reportGpsLocation.execute({
        domiciliarioId,
        lat: Number(payload.lat),
        lng: Number(payload.lng),
        velocidadKmh: payload.velocidadKmh !== undefined ? Number(payload.velocidadKmh) : undefined,
        bateriaPct: payload.bateriaPct !== undefined ? Number(payload.bateriaPct) : undefined,
        pedidoId: payload.pedidoId ? String(payload.pedidoId) : null,
        actor,
      });
      return { status: 200, body: result };
    }

    // 10. Iniciar / Terminar Turno: POST /api/couriers/:id/shift
    const shiftMatch = cleanPath.match(/^\/api\/couriers\/([^/]+)\/shift$/);
    if (method === 'POST' && shiftMatch) {
      const domiciliarioId = decodeURIComponent(shiftMatch[1]);
      const courier = await container.toggleCourierShift.execute({
        domiciliarioId,
        enTurno: Boolean(payload.enTurno),
        actor,
      });
      return { status: 200, body: { courier } };
    }

    // 11. Administrar Distribuidor CRM/ERP: POST /api/distributors
    if (method === 'POST' && cleanPath === '/api/distributors') {
      const distributor = await container.manageDistributors.upsert({
        id: payload.id ? String(payload.id) : undefined,
        nombre: String(payload.nombre ?? ''),
        nit: String(payload.nit ?? ''),
        segmento: payload.segmento as 'mayorista' | 'minorista' | 'horeca' | 'ecommerce' | 'institucional',
        etapaComercial: payload.etapaComercial as 'prospecto' | 'negociacion' | 'activo' | 'en_riesgo' | 'inactivo',
        contactoNombre: String(payload.contactoNombre ?? ''),
        contactoEmail: String(payload.contactoEmail ?? ''),
        contactoTelefono: String(payload.contactoTelefono ?? ''),
        direccion: String(payload.direccion ?? ''),
        localidad: String(payload.localidad ?? 'Chapinero'),
        lat: Number(payload.lat ?? 4.65),
        lng: Number(payload.lng ?? -74.06),
        capacidadAlmacenamientoUnidades: payload.capacidadAlmacenamientoUnidades
          ? Number(payload.capacidadAlmacenamientoUnidades)
          : undefined,
        inventarioDisponibleUnidades: payload.inventarioDisponibleUnidades
          ? Number(payload.inventarioDisponibleUnidades)
          : undefined,
        actor,
      });
      return { status: 200, body: { distributor } };
    }

    // 12. Administrar Rol de Perfil: PATCH /api/profiles/:id/role
    const profileRoleMatch = cleanPath.match(/^\/api\/profiles\/([^/]+)\/role$/);
    if ((method === 'PATCH' || method === 'POST') && profileRoleMatch) {
      const targetProfileId = decodeURIComponent(profileRoleMatch[1]);
      const profile = await container.manageProfiles.changeUserRole({
        targetProfileId,
        nuevoRol: payload.nuevoRol as 'admin' | 'operador' | 'distribuidor' | 'domiciliario' | 'pendiente',
        distribuidorId: payload.distribuidorId ? String(payload.distribuidorId) : undefined,
        domiciliarioId: payload.domiciliarioId ? String(payload.domiciliarioId) : undefined,
        actor,
      });
      return { status: 200, body: { profile } };
    }

    return {
      status: 404,
      body: { code: 'ENDPOINT_NOT_FOUND', path: cleanPath, method },
    };
  } catch (err) {
    if (err instanceof DomainRuleError) {
      const statusMap: Record<string, number> = {
        ENTITY_NOT_FOUND: 404,
        UNAUTHORIZED_ACTION: 403,
        ACCOUNT_PENDING_APPROVAL: 403,
        SELF_ROLE_ASSIGNMENT_FORBIDDEN: 403,
        CONCURRENCY_CONFLICT: 409,
        ORDER_ALREADY_ASSIGNED: 409,
        COURIER_OFF_SHIFT: 409,
        COURIER_NO_CAPACITY: 409,
        COURIER_LOCATION_STALE: 409,
        INVALID_STATE_TRANSITION: 409,
      };
      return {
        status: statusMap[err.code] ?? 400,
        body: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      };
    }

    return {
      status: 500,
      body: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'Error inesperado en el servidor.',
      },
    };
  }
}
