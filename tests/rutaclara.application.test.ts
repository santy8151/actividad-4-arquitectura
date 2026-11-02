import { describe, expect, it } from 'vitest';
import {
  AssignCourierUseCase,
  ChangeOrderStatusUseCase,
  SuggestNearbyCouriersUseCase,
} from '../core/application';
import { DomainRuleError } from '../core/domain';
import { createInitialBogotaSeed, TransactionalRutaClaraStore } from '../core/infrastructure';

describe('RutaClara Application Use Cases (core/application)', () => {
  it('AssignCourierUseCase reserva el cupo de forma atómica y registra evento en la bitácora', async () => {
    const store = new TransactionalRutaClaraStore(createInitialBogotaSeed());
    const ports = store.createPorts();
    const useCase = new AssignCourierUseCase({
      orders: ports.orders,
      couriers: ports.couriers,
      events: ports.events,
      clock: ports.clock,
    });

    const courierBefore = await ports.couriers.findById('c0000000-0000-4000-8000-000000000001');
    expect(courierBefore?.cargaActual).toBe(2);

    const result = await useCase.execute({
      pedidoId: 'd1000000-0000-4000-8000-000000000001',
      domiciliarioId: 'c0000000-0000-4000-8000-000000000001',
      expectedVersion: 1,
      actor: { id: 'usr-operador', nombre: 'Daniela Ospina', rol: 'operador' },
    });

    expect(result.order.estado).toBe('asignado');
    expect(result.order.version).toBe(2);
    expect(result.courier.cargaActual).toBe(3);

    const events = await ports.events.listByOrder('d1000000-0000-4000-8000-000000000001');
    expect(events[0].tipo).toBe('DOMICILIARIO_ASIGNADO');
  });

  it('AssignCourierUseCase libera el cupo reservado (compensación) si falla el guardado del pedido', async () => {
    const store = new TransactionalRutaClaraStore(createInitialBogotaSeed());
    const ports = store.createPorts();

    // Simulamos un fallo en updateWithVersion después de haber reservado el cupo atómicamente
    const failingOrdersRepo = {
      ...ports.orders,
      async updateWithVersion() {
        throw new DomainRuleError('CONCURRENCY_CONFLICT', 'Fallo simulado de concurrencia al guardar pedido.');
      },
    };

    const useCase = new AssignCourierUseCase({
      orders: failingOrdersRepo,
      couriers: ports.couriers,
      events: ports.events,
      clock: ports.clock,
    });

    const courierBefore = await ports.couriers.findById('dom-02');
    expect(courierBefore?.cargaActual).toBe(1);

    await expect(
      useCase.execute({
        pedidoId: 'ped-02',
        domiciliarioId: 'dom-02',
        actor: { id: 'usr-operador', nombre: 'Daniela Ospina', rol: 'operador' },
      })
    ).rejects.toThrowError(DomainRuleError);

    // Verificar que el cupo fue liberado automáticamente tras el fallo
    const courierAfter = await ports.couriers.findById('dom-02');
    expect(courierAfter?.cargaActual).toBe(1);
  });

  it('SuggestNearbyCouriersUseCase prioriza domiciliarios elegibles y cercanos al origen/destino', async () => {
    const store = new TransactionalRutaClaraStore(createInitialBogotaSeed());
    const ports = store.createPorts();
    const suggestUseCase = new SuggestNearbyCouriersUseCase({
      orders: ports.orders,
      couriers: ports.couriers,
      clock: ports.clock,
    });

    const suggestions = await suggestUseCase.execute('d1000000-0000-4000-8000-000000000001');
    expect(suggestions.length).toBe(5);
    expect(suggestions[0].evaluation.eligible).toBe(true);
    // El domiciliario más cercano a Chapinero es Mateo Castellanos (DOM-BOG-01)
    expect(suggestions[0].courier.codigo).toBe('DOM-BOG-01');

    // Los no elegibles (dom-04 por GPS > 10m y dom-05 por fuera de turno) quedan al final
    const ineligible = suggestions.filter((s) => !s.evaluation.eligible);
    expect(ineligible.length).toBe(2);
  });

  it('ChangeOrderStatusUseCase libera el cupo del domiciliario cuando el pedido pasa a entregado', async () => {
    const store = new TransactionalRutaClaraStore(createInitialBogotaSeed());
    const ports = store.createPorts();
    const changeStatus = new ChangeOrderStatusUseCase({
      orders: ports.orders,
      couriers: ports.couriers,
      events: ports.events,
      clock: ports.clock,
    });

    const courierBefore = await ports.couriers.findById('c0000000-0000-4000-8000-000000000001');
    expect(courierBefore?.cargaActual).toBe(2);

    const res = await changeStatus.execute({
      pedidoId: 'ped-05', // está 'en_ruta' con Mateo Castellanos
      nuevoEstado: 'entregado',
      expectedVersion: 3,
      detalle: 'Recibido en barra principal de Café Pergamino',
      actor: {
        id: 'usr-domiciliario',
        nombre: 'Mateo Castellanos',
        rol: 'domiciliario',
        domiciliarioId: 'c0000000-0000-4000-8000-000000000001',
      },
    });

    expect(res.order.estado).toBe('entregado');
    expect(res.order.version).toBe(4);
    expect(res.updatedCourier?.cargaActual).toBe(1);
    expect(res.updatedCourier?.entregasHoy).toBe(12);
  });
});

import { handleRutaClaraApiRequest } from '../core/infrastructure/httpApiHandler';

describe('RutaClara Serverless API Handler (Vercel & Netlify Functions)', () => {
  it('responde health check y expone el vertical slice /api/deliveries/:id', async () => {
    const health = await handleRutaClaraApiRequest({
      method: 'GET',
      path: '/api/health',
      headers: {},
    });
    expect(health.status).toBe(200);
    expect((health.body as { status: string }).status).toBe('healthy');

    const slice = await handleRutaClaraApiRequest({
      method: 'GET',
      path: '/api/deliveries/d1000000-0000-4000-8000-000000000001',
      headers: {},
    });
    expect(slice.status).toBe(200);
    expect((slice.body as { deliveryId: string }).deliveryId).toBe(
      'd1000000-0000-4000-8000-000000000001'
    );
  });

  it('bloquea auto-asignación de rol en PATCH /api/profiles/:id/role con HTTP 403', async () => {
    const res = await handleRutaClaraApiRequest({
      method: 'PATCH',
      path: '/api/profiles/usr-admin/role',
      headers: { 'x-rutaclara-profile-id': 'usr-admin' },
      body: { nuevoRol: 'operador' },
    });
    expect(res.status).toBe(403);
    expect((res.body as { code: string }).code).toBe('SELF_ROLE_ASSIGNMENT_FORBIDDEN');
  });
});
