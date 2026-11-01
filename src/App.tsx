import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, CircleGauge, Compass, Database, Gauge, Layers3, MapPinned, PackageCheck, Search, ShieldCheck, Truck, UserCircle2, Waypoints } from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import { lastMileClient, ApiError } from './api/lastMileClient';
import { getDashboardMetrics, getInventory, getOrders, getWarehouses, getCustomers, getIncidents } from './adapters/DemoErpCrmAdapter';
import type { ConnectionState, DeliveryResponse, DispatchState } from './types';

type ModuleKey = 'dashboard' | 'dispatch' | 'map' | 'erp' | 'crm' | 'observability';

type RoleKey = 'Administrador' | 'Gerente de Operaciones' | 'Coordinador Logístico' | 'Operador de Despacho' | 'Encargado de Bodega' | 'Repartidor' | 'Agente de Servicio al Cliente';

const roleMenus: Record<RoleKey, ModuleKey[]> = {
  Administrador: ['dashboard', 'dispatch', 'map', 'erp', 'crm', 'observability'],
  'Gerente de Operaciones': ['dashboard', 'dispatch', 'map', 'erp', 'observability'],
  'Coordinador Logístico': ['dashboard', 'dispatch', 'map', 'erp'],
  'Operador de Despacho': ['dashboard', 'dispatch', 'map'],
  'Encargado de Bodega': ['dashboard', 'erp', 'map'],
  Repartidor: ['dashboard', 'map'],
  'Agente de Servicio al Cliente': ['dashboard', 'crm', 'map']
};

const modules = [
  { id: 'dashboard', label: 'Dashboard', icon: CircleGauge },
  { id: 'dispatch', label: 'Despacho', icon: Truck },
  { id: 'map', label: 'Mapa', icon: MapPinned },
  { id: 'erp', label: 'ERP', icon: Building2 },
  { id: 'crm', label: 'CRM', icon: UserCircle2 },
  { id: 'observability', label: 'Observabilidad', icon: Database }
] as const;

const initialDeliveryId = 'd1000000-0000-4000-8000-000000000001';
const initialCourierId = 'c0000000-0000-4000-8000-000000000001';

const mapCenter: LatLngExpression = [4.7110, -74.0721];

function App() {
  const [selectedModule, setSelectedModule] = useState<ModuleKey>('dashboard');
  const [selectedRole, setSelectedRole] = useState<RoleKey>('Gerente de Operaciones');
  const [connectionState, setConnectionState] = useState<ConnectionState>('Conectando');
  const [delivery, setDelivery] = useState<DeliveryResponse | null>(null);
  const [dispatchState, setDispatchState] = useState<DispatchState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deliveryId, setDeliveryId] = useState(initialDeliveryId);
  const [courierId, setCourierId] = useState(initialCourierId);

  const orders = useMemo(() => getOrders(), []);
  const inventory = useMemo(() => getInventory(), []);
  const warehouses = useMemo(() => getWarehouses(), []);
  const customers = useMemo(() => getCustomers(), []);
  const incidents = useMemo(() => getIncidents(), []);
  const metrics = useMemo(() => getDashboardMetrics(), []);

  const visibleModules = useMemo(() => modules.filter((m) => roleMenus[selectedRole].includes(m.id as ModuleKey)), [selectedRole]);

  async function refreshHealth() {
    try {
      const response = await lastMileClient.getHealth();
      const connected = response.status === 'healthy' || response.connected;
      setConnectionState(connected ? 'Conectado' : 'Desconectado');
    } catch {
      setConnectionState('Error de conexión');
    }
  }

  async function refreshDelivery() {
    try {
      const payload = await lastMileClient.getDelivery(deliveryId);
      setDelivery(payload);
    } catch (err) {
      const apiError = err as ApiError;
      setErrorMessage(apiError.message || 'No se pudo consultar la entrega.');
    }
  }

  useState(() => {
    refreshHealth();
    refreshDelivery();
  });

  useMemo(() => {
    const timer = window.setInterval(() => {
      refreshHealth();
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  async function handleAssign() {
    setDispatchState('VALIDATING');
    setErrorMessage(null);

    if (!deliveryId || !courierId) {
      setDispatchState('DOMAIN_ERROR');
      setErrorMessage('Debe proporcionar una entrega y un repartidor válidos.');
      return;
    }

    setDispatchState('SUBMITTING');
    try {
      await lastMileClient.assignCourier(deliveryId, courierId);
      setDispatchState('CONFIRMED');
      await refreshDelivery();
      await refreshHealth();
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.status === 409) {
        setDispatchState('DOMAIN_ERROR');
      } else if (apiError.status === 503) {
        setDispatchState('INTEGRATION_ERROR');
      } else {
        setDispatchState('NETWORK_ERROR');
      }
      setErrorMessage(apiError.message || 'La operación no pudo confirmarse.');
    }
  }

  function renderDashboard() {
    const cards = [
      { label: 'Pedidos registrados', value: metrics.orders, tone: 'bg-blue-50 text-blue-700' },
      { label: 'Entregas pendientes', value: metrics.pendingDeliveries, tone: 'bg-orange-50 text-orange-700' },
      { label: 'Entregas asignadas', value: metrics.assignedDeliveries, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Entregas completadas', value: metrics.completedDeliveries, tone: 'bg-cyan-50 text-cyan-700' },
      { label: 'Repartidores disponibles', value: metrics.availableCouriers, tone: 'bg-indigo-50 text-indigo-700' },
      { label: 'Vehículos activos', value: metrics.activeVehicles, tone: 'bg-violet-50 text-violet-700' },
      { label: 'Incidencias abiertas', value: metrics.openIncidents, tone: 'bg-red-50 text-red-700' },
      { label: 'Pedidos listos', value: metrics.readyOrders, tone: 'bg-teal-50 text-teal-700' }
    ];

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="card p-4">
              <div className={`inline-flex rounded-xl p-3 ${card.tone}`}>
                <Gauge className="h-5 w-5" />
              </div>
              <div className="mt-4 text-3xl font-bold text-slate-900">{card.value}</div>
              <div className="mt-1 text-sm text-slate-500">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="card p-5 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Entregas por día</h3>
              <span className="badge demo">MODO DEMO</span>
            </div>
            <div className="flex h-52 items-end gap-3">
              {[45, 62, 58, 80, 96, 74, 110].map((value, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full rounded-t-xl bg-gradient-to-t from-blue-600 to-cyan-400" style={{ height: `${value}%` }} />
                  <span className="text-xs text-slate-500">{['L', 'M', 'X', 'J', 'V', 'S', 'D'][idx]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900">Indicadores ERP</h3>
            <div className="mt-4 space-y-4">
              {[
                { label: 'Cumplimiento SLA', value: '94.2%' },
                { label: 'Inventario crítico', value: '3 SKU' },
                { label: 'Capacidad bodegas', value: '82%' }
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>{item.label}</span>
                    <span className="font-bold text-slate-900">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderDispatch() {
    return (
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Vertical slice de despacho</h3>
            <span className="badge real">API REAL - SQLITE</span>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-slate-700">Delivery ID</label>
            <input value={deliveryId} onChange={(e) => setDeliveryId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" />

            <label className="block text-sm font-medium text-slate-700">Courier ID</label>
            <input value={courierId} onChange={(e) => setCourierId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" />

            <div className="flex gap-3">
              <button onClick={refreshDelivery} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Consultar</button>
              <button onClick={handleAssign} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" disabled={dispatchState === 'SUBMITTING'}>
                {dispatchState === 'SUBMITTING' ? 'Asignando...' : 'Asignar repartidor'}
              </button>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Estado de FSM</span>
                <span className="font-semibold text-slate-800">{dispatchState}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-blue-600" style={{ width: dispatchState === 'CONFIRMED' ? '100%' : dispatchState === 'SUBMITTING' ? '65%' : '30%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Resultado de entrega</h3>
          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span>Delivery ID</span>
              <span className="font-semibold text-slate-900">{delivery?.deliveryId ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span>Estado</span>
              <span className="font-semibold text-slate-900">{delivery?.status ?? 'Desconocido'}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span>Repartidor</span>
              <span className="font-semibold text-slate-900">{delivery?.courierId ?? 'Sin asignar'}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span>Versión</span>
              <span className="font-semibold text-slate-900">{delivery?.version ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderMap() {
    const mapMarkers = [
      { id: 'delivery', name: 'Entrega demo', position: [4.7110, -74.0721] as [number, number], color: 'blue' },
      { id: 'wh-01', name: 'Bodega Norte', position: [4.7240, -74.0850] as [number, number], color: 'green' },
      { id: 'wh-02', name: 'Bodega Medellín', position: [6.2442, -75.5812] as [number, number], color: 'orange' }
    ];

    return (
      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
        <div className="card overflow-hidden p-2">
          <div className="mb-3 flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-2 text-slate-700">
              <Layers3 className="h-4 w-4" />
              <span className="text-sm font-medium">Capas del mapa</span>
            </div>
            <div className="flex gap-2">
              {['Pedidos', 'Entregas', 'Repartidores', 'Rutas'].map((layer) => (
                <span key={layer} className="badge demo">{layer}</span>
              ))}
            </div>
          </div>
          <div className="h-[520px]">
            <MapContainer center={mapCenter} zoom={10} scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mapMarkers.map((marker) => (
                <Marker key={marker.id} position={marker.position}>
                  <Popup>{marker.name}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900">Drawer contextual</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="flex justify-between"><span>Delivery ID</span><span className="font-semibold">{delivery?.deliveryId ?? initialDeliveryId}</span></div>
              <div className="flex justify-between"><span>Estado</span><span className="font-semibold">{delivery?.status ?? 'Pending'}</span></div>
              <div className="flex justify-between"><span>Procedencia</span><span className="font-semibold">API REAL - SQLITE</span></div>
              <div className="flex justify-between"><span>Dirección</span><span className="font-semibold text-right">Calle 10 # 20-30, Bogotá</span></div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900">Legend</h3>
            <div className="mt-4 space-y-3 text-sm">
              {[
                ['#2563EB', 'Pedidos'],
                ['#0F9D91', 'Entregas'],
                ['#F59E0B', 'Repartidores'],
                ['#DC2626', 'Incidencias']
              ].map(([color, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-slate-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderErp() {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="card p-5 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Pedidos</h3>
              <span className="badge demo">DEMO</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pb-3">Código</th>
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3">Ciudad</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t border-slate-100">
                      <td className="py-3 font-medium text-slate-900">{order.code}</td>
                      <td className="py-3">{order.customer}</td>
                      <td className="py-3">{order.city}</td>
                      <td className="py-3">${order.total.toLocaleString('es-CO')}</td>
                      <td className="py-3"><span className="badge demo">{order.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900">Inventario</h3>
            <div className="mt-4 space-y-3">
              {inventory.map((item) => (
                <div key={item.sku} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{item.name}</span>
                    <span className="text-xs text-slate-500">{item.category}</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-700">Disponible: {item.stockAvailable} / {item.stockPhysical}</div>
                  <div className="mt-1 text-xs text-amber-700">Mínimo: {item.minimumLevel}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderCrm() {
    return (
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Clientes</h3>
          <div className="mt-4 space-y-3">
            {customers.map((customer) => (
              <div key={customer.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{customer.name}</div>
                    <div className="text-xs text-slate-500">{customer.document}</div>
                  </div>
                  <span className="badge demo">{customer.segment}</span>
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  {customer.email} · {customer.phone} · {customer.city}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Incidencias</h3>
          <div className="mt-4 space-y-3">
            {incidents.map((incident) => (
              <div key={incident.id} className="rounded-xl bg-red-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-red-800">{incident.code}</span>
                  <span className="text-xs text-red-700">{incident.priority}</span>
                </div>
                <div className="mt-2 text-sm text-slate-700">{incident.type}</div>
                <div className="mt-1 text-xs text-slate-500">{incident.owner} · {incident.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderObservability() {
    return (
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Observabilidad & Architecture Center</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="rounded-xl bg-slate-50 p-3">React + TypeScript → LastMile.Api → Application → Domain → Infrastructure → SQLite</div>
            <div className="rounded-xl bg-slate-50 p-3">Puertos: IDeliveryRepository, ICourierAvailability, IRouteCapacity, IAssignmentEvents</div>
            <div className="rounded-xl bg-slate-50 p-3">Outbox: AssignCourierUseCase → DbContext → OutboxRecord → OutboxDispatcher</div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Señales</h3>
          <div className="mt-4 space-y-3">
            {[
              ['Solicitudes', '244'],
              ['Errores', '5'],
              ['Tiempo medio', '184 ms'],
              ['Asignaciones', '12']
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-semibold text-slate-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const content = selectedModule === 'dashboard' ? renderDashboard() : selectedModule === 'dispatch' ? renderDispatch() : selectedModule === 'map' ? renderMap() : selectedModule === 'erp' ? renderErp() : selectedModule === 'crm' ? renderCrm() : renderObservability();

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-slate-200 bg-[#102A43] text-white">
          <div className="flex items-center gap-3 border-b border-slate-700 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold">L</div>
            <div>
              <div className="font-semibold">LASTMILE</div>
              <div className="text-xs text-slate-300">ERP & CRM</div>
            </div>
          </div>

          <nav className="space-y-2 p-4">
            {visibleModules.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedModule(item.id as ModuleKey)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${selectedModule === item.id ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-800'}`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                <Search className="mr-2 h-4 w-4" />
                Buscar acciones
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as RoleKey)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                {Object.keys(roleMenus).map((role) => (
                  <option key={role} value={role}>{role} [DEMO]</option>
                ))}
              </select>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="status-dot" style={{ backgroundColor: connectionState === 'Conectado' ? '#16a34a' : connectionState === 'Conectando' ? '#f59e0b' : connectionState === 'Error de conexión' ? '#dc2626' : '#475569' }} />
                {connectionState}
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-800">GS</div>
            </div>
          </header>

          <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-sm uppercase tracking-[0.18em] text-blue-700">Centro de control logístico</div>
                <h1 className="mt-1 text-3xl font-bold text-slate-900">LastMile ERP & CRM</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge real">API REAL - SQLITE</span>
                <span className="badge demo">MODO DEMO</span>
              </div>
            </div>

            {content}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
