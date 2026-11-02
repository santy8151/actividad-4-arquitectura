import {
  AssignCourierUseCase,
  ChangeOrderStatusUseCase,
  CreateOrderUseCase,
  ManageDistributorsUseCase,
  ManageProfilesUseCase,
  ReportGpsLocationUseCase,
  SuggestNearbyCouriersUseCase,
  ToggleCourierShiftUseCase,
  type ApplicationPorts,
} from '../application';
import { defaultRutaClaraStore, TransactionalRutaClaraStore } from './repositories';

export function buildRutaClaraUseCases(store: TransactionalRutaClaraStore = defaultRutaClaraStore) {
  const ports: ApplicationPorts = store.createPorts();

  return {
    store,
    ports,
    createOrder: new CreateOrderUseCase({
      orders: ports.orders,
      distributors: ports.distributors,
      events: ports.events,
      clock: ports.clock,
    }),
    assignCourier: new AssignCourierUseCase({
      orders: ports.orders,
      couriers: ports.couriers,
      events: ports.events,
      clock: ports.clock,
    }),
    changeOrderStatus: new ChangeOrderStatusUseCase({
      orders: ports.orders,
      couriers: ports.couriers,
      events: ports.events,
      clock: ports.clock,
    }),
    suggestNearbyCouriers: new SuggestNearbyCouriersUseCase({
      orders: ports.orders,
      couriers: ports.couriers,
      clock: ports.clock,
    }),
    reportGpsLocation: new ReportGpsLocationUseCase({
      couriers: ports.couriers,
      gpsTraces: ports.gpsTraces,
      clock: ports.clock,
    }),
    toggleCourierShift: new ToggleCourierShiftUseCase({
      couriers: ports.couriers,
      orders: ports.orders,
      clock: ports.clock,
    }),
    manageDistributors: new ManageDistributorsUseCase({
      distributors: ports.distributors,
      clock: ports.clock,
    }),
    manageProfiles: new ManageProfilesUseCase({
      profiles: ports.profiles,
      clock: ports.clock,
    }),
  };
}

export * from './bogotaDemoSeed';
export * from './repositories';
export * from './netlifyIdentityService';
