import { describe, expect, it } from 'vitest';
import {
  assignCourierToOrder,
  assignUserRole,
  calculateDistanceKm,
  canTransitionOrder,
  createOrderEntity,
  DomainRuleError,
  evaluateCourierForAssignment,
  hasPermission,
  isCourierLocationStale,
  transitionOrderState,
  validateDistributorData,
  type Courier,
  type UserProfile,
} from '../core/domain';

describe('RutaClara Core Domain Rules (core/domain)', () => {
  const nowIso = '2026-11-02T15:00:00.000Z';
  const nowMs = new Date(nowIso).getTime();

  it('valida la máquina de estados del pedido (pendiente → asignado → en_ruta → entregado/fallido y cancelado)', () => {
    expect(canTransitionOrder('pendiente', 'asignado')).toBe(true);
    expect(canTransitionOrder('pendiente', 'cancelado')).toBe(true);
    expect(canTransitionOrder('pendiente', 'entregado')).toBe(false);

    expect(canTransitionOrder('asignado', 'en_ruta')).toBe(true);
    expect(canTransitionOrder('asignado', 'pendiente')).toBe(true);
    expect(canTransitionOrder('asignado', 'cancelado')).toBe(true);
    expect(canTransitionOrder('asignado', 'entregado')).toBe(false);

    expect(canTransitionOrder('en_ruta', 'entregado')).toBe(true);
    expect(canTransitionOrder('en_ruta', 'fallido')).toBe(true);
    expect(canTransitionOrder('en_ruta', 'cancelado')).toBe(true);

    expect(canTransitionOrder('entregado', 'en_ruta')).toBe(false);
    expect(canTransitionOrder('fallido', 'asignado')).toBe(false);
    expect(canTransitionOrder('cancelado', 'pendiente')).toBe(false);
  });

  it('incrementa la versión del pedido en cada transición y genera evento en la bitácora', () => {
    const { order: created, event: createEvt } = createOrderEntity({
      id: 'ped-test-1',
      codigo: 'RC-TEST-01',
      distribuidorId: 'dist-01',
      clienteNombre: 'Clínica Palermo',
      clienteTelefono: '3101234567',
      direccionEntrega: 'Calle 45 # 22-10',
      localidad: 'Teusaquillo',
      origenLat: 4.6512,
      origenLng: -74.0595,
      destinoLat: 4.639,
      destinoLng: -74.071,
      itemsResumen: '5x Insumos',
      pesoTotalKg: 4,
      valorTotalCop: 250000,
      actorId: 'usr-operador',
      actorNombre: 'Operador',
      actorRol: 'operador',
      nowIso,
    });

    expect(created.estado).toBe('pendiente');
    expect(created.version).toBe(1);
    expect(createEvt.tipo).toBe('PEDIDO_CREADO');

    const { updatedOrder: assigned, event: assignEvt } = assignCourierToOrder(
      created,
      'dom-01',
      'Mateo Castellanos',
      { id: 'usr-operador', nombre: 'Operador', rol: 'operador' },
      nowIso,
      1
    );

    expect(assigned.estado).toBe('asignado');
    expect(assigned.version).toBe(2);
    expect(assignEvt.versionPedido).toBe(2);

    const { updatedOrder: inRoute } = transitionOrderState(
      assigned,
      'en_ruta',
      { id: 'usr-dom', nombre: 'Mateo', rol: 'domiciliario' },
      nowIso,
      { expectedVersion: 2 }
    );
    expect(inRoute.estado).toBe('en_ruta');
    expect(inRoute.version).toBe(3);

    const { updatedOrder: delivered, releasedCourierId } = transitionOrderState(
      inRoute,
      'entregado',
      { id: 'usr-dom', nombre: 'Mateo', rol: 'domiciliario' },
      nowIso,
      { expectedVersion: 3 }
    );
    expect(delivered.estado).toBe('entregado');
    expect(delivered.version).toBe(4);
    expect(releasedCourierId).toBe('dom-01');
  });

  it('detecta conflictos de versión simultánea (optimistic concurrency)', () => {
    const { order } = createOrderEntity({
      id: 'ped-test-2',
      codigo: 'RC-TEST-02',
      distribuidorId: 'dist-01',
      clienteNombre: 'Cliente Demo',
      clienteTelefono: '3000000000',
      direccionEntrega: 'Cra 15 # 85-10',
      localidad: 'Chapinero',
      origenLat: 4.65,
      origenLng: -74.05,
      destinoLat: 4.66,
      destinoLng: -74.06,
      itemsResumen: '1x Paquete',
      pesoTotalKg: 1,
      valorTotalCop: 50000,
      actorId: 'usr-1',
      actorNombre: 'Op',
      actorRol: 'operador',
      nowIso,
    });

    expect(() =>
      assignCourierToOrder(
        order,
        'dom-01',
        'Mateo',
        { id: 'usr-1', nombre: 'Op', rol: 'operador' },
        nowIso,
        99 // Versión incorrecta
      )
    ).toThrowError(DomainRuleError);
  });

  it('verifica las reglas del domiciliario: turno activo, cupo libre y ubicación GPS desactualizada tras 10 minutos', () => {
    const baseCourier: Courier = {
      id: 'dom-1',
      codigo: 'DOM-01',
      nombre: 'Mateo',
      telefono: '312000',
      vehiculo: 'moto',
      placa: 'ABC-12D',
      enTurno: true,
      cargaActual: 2,
      capacidadMaxima: 4,
      lat: 4.65,
      lng: -74.06,
      ultimoReporteGps: new Date(nowMs - 5 * 60 * 1000).toISOString(), // Hace 5 min (fresco)
      zonaBase: 'Chapinero',
      calificacion: 4.9,
      entregasHoy: 5,
    };

    expect(isCourierLocationStale(baseCourier.ultimoReporteGps, nowMs)).toBe(false);
    expect(evaluateCourierForAssignment(baseCourier, nowMs).eligible).toBe(true);

    // 11 minutos después -> Desactualizada
    const staleCourier: Courier = {
      ...baseCourier,
      ultimoReporteGps: new Date(nowMs - 11 * 60 * 1000).toISOString(),
    };
    expect(isCourierLocationStale(staleCourier.ultimoReporteGps, nowMs)).toBe(true);
    const staleEval = evaluateCourierForAssignment(staleCourier, nowMs);
    expect(staleEval.eligible).toBe(false);
    expect(staleEval.codigoRechazo).toBe('COURIER_LOCATION_STALE');

    // Sin cupo libre
    const fullCourier: Courier = { ...baseCourier, cargaActual: 4, capacidadMaxima: 4 };
    expect(evaluateCourierForAssignment(fullCourier, nowMs).codigoRechazo).toBe('COURIER_NO_CAPACITY');

    // Fuera de turno
    const offShiftCourier: Courier = { ...baseCourier, enTurno: false };
    expect(evaluateCourierForAssignment(offShiftCourier, nowMs).codigoRechazo).toBe('COURIER_OFF_SHIFT');
  });

  it('valida segmento y etapa comercial de cada distribuidor', () => {
    expect(() =>
      validateDistributorData({
        nombre: 'Distribuidora Norte',
        nit: '900.123.456-7',
        segmento: 'horeca',
        etapaComercial: 'activo',
        contactoNombre: 'Ana',
        contactoEmail: 'ana@norte.co',
        direccion: 'Calle 100 # 15-20',
        lat: 4.68,
        lng: -74.05,
      })
    ).not.toThrow();

    expect(() =>
      validateDistributorData({
        nombre: 'Distribuidora Inválida',
        nit: '900.123.456-7',
        segmento: 'segmento_inexistente',
        etapaComercial: 'activo',
        contactoNombre: 'Ana',
        contactoEmail: 'ana@norte.co',
        direccion: 'Calle 100',
        lat: 4.68,
        lng: -74.05,
      })
    ).toThrowError(DomainRuleError);
  });

  it('verifica permisos por perfil e impide que un usuario se asigne un rol a sí mismo', () => {
    expect(hasPermission('admin', 'profiles:manage')).toBe(true);
    expect(hasPermission('operador', 'orders:assign')).toBe(true);
    expect(hasPermission('operador', 'profiles:manage')).toBe(false);
    expect(hasPermission('pendiente', 'orders:create')).toBe(false);

    const adminActor: UserProfile = {
      id: 'usr-admin',
      email: 'admin@rutaclara.co',
      nombre: 'Admin',
      rol: 'admin',
      cargo: 'Admin',
      avatarColor: '#10b981',
      aprobado: true,
      ultimoAcceso: nowIso,
    };

    // Ningún usuario puede asignarse un rol a sí mismo
    expect(() => assignUserRole(adminActor, adminActor, 'operador', nowIso)).toThrowError(
      /ningún usuario puede asignarse/i
    );

    const pendingTarget: UserProfile = {
      id: 'usr-pending',
      email: 'nuevo@rutaclara.co',
      nombre: 'Nuevo',
      rol: 'pendiente',
      cargo: 'Externo',
      avatarColor: '#64748b',
      aprobado: false,
      ultimoAcceso: nowIso,
    };

    const approved = assignUserRole(adminActor, pendingTarget, 'distribuidor', nowIso);
    expect(approved.rol).toBe('distribuidor');
    expect(approved.aprobado).toBe(true);
  });

  it('calcula distancia geodésica Haversine correctamente en Bogotá', () => {
    const dKm = calculateDistanceKm(4.6512, -74.0595, 4.6768, -74.0482);
    expect(dKm).toBeGreaterThan(2.5);
    expect(dKm).toBeLessThan(3.5);
  });
});
