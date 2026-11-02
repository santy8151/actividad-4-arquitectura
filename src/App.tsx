import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  FileSpreadsheet,
  Filter,
  FlaskConical,
  History,
  KeyRound,
  Layers,
  Lock,
  MapPin,
  Navigation,
  Package,
  PackagePlus,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Truck,
  UserCheck,
  Users,
  Warehouse,
  XCircle,
} from 'lucide-react';
import {
  canTransitionOrder,
  DomainRuleError,
  getMinutesSinceLastGps,
  hasPermission,
  isCourierLocationStale,
  VALID_COMMERCIAL_STAGES,
  VALID_DISTRIBUTOR_SEGMENTS,
  VALID_ORDER_TRANSITIONS,
  VALID_USER_ROLES,
  type CommercialStage,
  type DistributorSegment,
  type OrderPriority,
  type OrderStatus,
  type UserProfile,
  type UserRole,
} from '@core/domain';
import type { CourierSuggestion } from '@core/application';
import { buildRutaClaraUseCases, identityAdapter } from '@core/infrastructure';
import {
  RutaClaraMap,
  type MapClickMode,
  type MapLayerVisibility,
  type MapTileStyle,
} from './components/RutaClaraMap';
import { LoginModal } from './components/LoginModal';

type MainTab = 'map_control' | 'crm_erp' | 'fleet' | 'architecture_admin';
type InspectorTab = 'order' | 'distributor' | 'courier';

const STATUS_BADGE: Record<OrderStatus, { label: string; cls: string }> = {
  pendiente: {
    label: 'Pendiente',
    cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  asignado: {
    label: 'Asignado',
    cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  en_ruta: {
    label: 'En Ruta',
    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  entregado: {
    label: 'Entregado',
    cls: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  },
  fallido: {
    label: 'Fallido',
    cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  cancelado: {
    label: 'Cancelado',
    cls: 'bg-slate-500/20 text-slate-300 border-slate-600/40',
  },
};

export function App() {
  const runtime = useMemo(() => buildRutaClaraUseCases(), []);
  const [snapshot, setSnapshot] = useState(() => runtime.store.getSnapshot());

  // Perfil autenticado actual
  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    return identityAdapter.getSavedSessionProfileId() || 'usr-admin';
  });

  const activeProfile: UserProfile = useMemo(() => {
    return (
      snapshot.profiles.find((p) => p.id === activeProfileId) ??
      snapshot.profiles[0]
    );
  }, [snapshot.profiles, activeProfileId]);

  // Navegación principal y estado del mapa
  const [mainTab, setMainTab] = useState<MainTab>('map_control');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('order');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    'd1000000-0000-4000-8000-000000000001'
  );
  const [selectedDistributorId, setSelectedDistributorId] = useState<string | null>('dist-01');
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(
    'c0000000-0000-4000-8000-000000000001'
  );
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);

  // Controles de visualización del mapa
  const [layers, setLayers] = useState<MapLayerVisibility>({
    distributors: true,
    couriers: true,
    orders: true,
    routes: true,
    gpsTrail: true,
    coverageRadius: true,
  });
  const [tileStyle, setTileStyle] = useState<MapTileStyle>('osm');
  const [clickMode, setClickMode] = useState<MapClickMode>('none');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'todos'>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Sugerencias de domiciliarios cercanos para el pedido seleccionado
  const [suggestions, setSuggestions] = useState<CourierSuggestion[]>([]);
  const [allowStaleOverride, setAllowStaleOverride] = useState(false);
  const [failReasonInput, setFailReasonInput] = useState('');

  // Modales y banners de feedback
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isNewDistributorOpen, setIsNewDistributorOpen] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    code?: string;
  } | null>(null);

  // Simulador GPS en tiempo real
  const [isSimulatingGps, setIsSimulatingGps] = useState(false);

  // Formulario de Nuevo Pedido
  const [newOrderForm, setNewOrderForm] = useState({
    distribuidorId: 'dist-01',
    clienteNombre: 'Clínica del Country — Unidad Quirúrgica',
    clienteTelefono: '+57 601 530 0470',
    direccionEntrega: 'Cra. 16 # 82-57, Bogotá',
    localidad: 'Chapinero',
    destinoLat: 4.6675,
    destinoLng: -74.0565,
    itemsResumen: '10x Cajas Suministros Hospitalarios Esterilizados',
    pesoTotalKg: 12.5,
    valorTotalCop: 2450000,
    prioridad: 'urgente' as OrderPriority,
    notas: 'Entregar en recepción de urgencias piso 1',
  });

  // Formulario de Nuevo / Editar Distribuidor CRM/ERP
  const [distForm, setDistForm] = useState({
    nombre: '',
    nit: '',
    segmento: 'mayorista' as DistributorSegment,
    etapaComercial: 'activo' as CommercialStage,
    contactoNombre: '',
    contactoEmail: '',
    contactoTelefono: '',
    direccion: '',
    localidad: 'Chapinero',
    lat: 4.661,
    lng: -74.058,
    capacidadAlmacenamientoUnidades: 2000,
    inventarioDisponibleUnidades: 1500,
  });

  function showNotification(
    type: 'success' | 'error' | 'info',
    title: string,
    message: string,
    code?: string
  ) {
    setToast({ type, title, message, code });
  }

  function syncSnapshot() {
    setSnapshot(runtime.store.getSnapshot());
  }

  // Recalcular sugerencias de domiciliarios cuando cambia el pedido seleccionado
  useEffect(() => {
    if (!selectedOrderId) {
      setSuggestions([]);
      return;
    }
    runtime.suggestNearbyCouriers
      .execute(selectedOrderId)
      .then((res) => setSuggestions(res))
      .catch(() => setSuggestions([]));
  }, [selectedOrderId, snapshot.orders, snapshot.couriers, runtime]);

  // Simulador de movimiento GPS en vivo por Bogotá
  useEffect(() => {
    if (!isSimulatingGps) return;
    const interval = window.setInterval(async () => {
      const current = runtime.store.getSnapshot();
      const activeOrders = current.orders.filter(
        (o) => (o.estado === 'en_ruta' || o.estado === 'asignado') && o.domiciliarioId
      );

      for (const ord of activeOrders) {
        const courier = current.couriers.find((c) => c.id === ord.domiciliarioId);
        if (!courier || !courier.enTurno) continue;

        const targetLat = ord.estado === 'asignado' ? ord.origenLat : ord.destinoLat;
        const targetLng = ord.estado === 'asignado' ? ord.origenLng : ord.destinoLng;

        const dLat = (targetLat - courier.lat) * 0.22 + (Math.random() - 0.5) * 0.0008;
        const dLng = (targetLng - courier.lng) * 0.22 + (Math.random() - 0.5) * 0.0008;

        try {
          await runtime.reportGpsLocation.execute({
            domiciliarioId: courier.id,
            lat: courier.lat + dLat,
            lng: courier.lng + dLng,
            velocidadKmh: Math.round(22 + Math.random() * 14),
            bateriaPct: Math.max(15, 90 - Math.floor(Math.random() * 5)),
            pedidoId: ord.id,
            actor: {
              id: 'usr-admin',
              nombre: 'Simulador Telemetría GPS',
              rol: 'admin',
            },
          });
        } catch {
          // Ignore simulation errors
        }
      }
      syncSnapshot();
    }, 2400);

    return () => window.clearInterval(interval);
  }, [isSimulatingGps, runtime]);

  // Filtrado de datos según el perfil del usuario (RBAC)
  const visibleOrders = useMemo(() => {
    let list = snapshot.orders;
    if (activeProfile.rol === 'distribuidor' && activeProfile.distribuidorId) {
      list = list.filter((o) => o.distribuidorId === activeProfile.distribuidorId);
    } else if (activeProfile.rol === 'domiciliario' && activeProfile.domiciliarioId) {
      list = list.filter((o) => o.domiciliarioId === activeProfile.domiciliarioId);
    }

    if (statusFilter !== 'todos') {
      list = list.filter((o) => o.estado === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o.codigo.toLowerCase().includes(q) ||
          o.clienteNombre.toLowerCase().includes(q) ||
          o.direccionEntrega.toLowerCase().includes(q) ||
          o.localidad.toLowerCase().includes(q)
      );
    }
    return list;
  }, [snapshot.orders, activeProfile, statusFilter, searchQuery]);

  const selectedOrder = useMemo(
    () => snapshot.orders.find((o) => o.id === selectedOrderId) ?? visibleOrders[0] ?? null,
    [snapshot.orders, selectedOrderId, visibleOrders]
  );

  const selectedDistributor = useMemo(
    () =>
      snapshot.distributors.find((d) => d.id === selectedDistributorId) ??
      snapshot.distributors[0] ??
      null,
    [snapshot.distributors, selectedDistributorId]
  );

  const selectedCourier = useMemo(
    () =>
      snapshot.couriers.find((c) => c.id === selectedCourierId) ??
      snapshot.couriers[0] ??
      null,
    [snapshot.couriers, selectedCourierId]
  );

  const selectedOrderEvents = useMemo(() => {
    if (!selectedOrder) return [];
    return snapshot.events
      .filter((e) => e.pedidoId === selectedOrder.id)
      .sort((a, b) => b.versionPedido - a.versionPedido);
  }, [snapshot.events, selectedOrder]);

  // Cambio de perfil activo
  function handleSwitchProfile(profile: UserProfile) {
    setActiveProfileId(profile.id);
    identityAdapter.saveSessionProfileId(profile.id);

    if (profile.rol === 'distribuidor' && profile.distribuidorId) {
      setSelectedDistributorId(profile.distribuidorId);
      setInspectorTab('distributor');
    } else if (profile.rol === 'domiciliario' && profile.domiciliarioId) {
      setSelectedCourierId(profile.domiciliarioId);
      setInspectorTab('courier');
    } else {
      setInspectorTab('order');
    }

    showNotification(
      'info',
      `Sesión cambiada a: ${profile.nombre}`,
      `Operando con el perfil '${profile.rol.toUpperCase()}' (${profile.cargo}).`
    );
  }

  // Handler para clic en el mapa (reportar GPS o elegir destino)
  async function handleMapCoordinatesPick(lat: number, lng: number) {
    if (clickMode === 'pick_destination') {
      setNewOrderForm((prev) => ({ ...prev, destinoLat: lat, destinoLng: lng }));
      setClickMode('none');
      setIsNewOrderOpen(true);
      showNotification(
        'info',
        'Coordenadas de destino fijadas',
        `Destino seleccionado en Bogotá: [${lat}, ${lng}].`
      );
      return;
    }

    if (clickMode === 'report_gps' && selectedCourier) {
      try {
        const res = await runtime.reportGpsLocation.execute({
          domiciliarioId: selectedCourier.id,
          lat,
          lng,
          velocidadKmh: 28,
          bateriaPct: 91,
          actor: activeProfile,
        });
        syncSnapshot();
        setClickMode('none');
        showNotification(
          'success',
          'Ubicación GPS Actualizada',
          `${res.courier.nombre} reportó posición en [${lat}, ${lng}]. Estado de frescura: < 1 min.`
        );
      } catch (err) {
        const domErr = err as DomainRuleError;
        showNotification('error', 'Error al reportar GPS', domErr.message, domErr.code);
      }
    }
  }

  // Caso de uso: Asignar Domiciliario con Reserva Atómica
  async function handleAssignCourier(pedidoId: string, domiciliarioId: string, expectedVersion?: number) {
    try {
      const res = await runtime.assignCourier.execute({
        pedidoId,
        domiciliarioId,
        expectedVersion,
        allowStaleLocationOverride: allowStaleOverride,
        actor: activeProfile,
      });
      syncSnapshot();
      showNotification(
        'success',
        'Asignación Atómica Confirmada',
        `${res.courier.nombre} asignado al pedido ${res.order.codigo} (versión v${res.order.version}). Cupo reservado: ${res.courier.cargaActual}/${res.courier.capacidadMaxima}.`
      );
    } catch (err) {
      const domErr = err as DomainRuleError;
      showNotification(
        'error',
        'Asignación Rechazada por Regla de Dominio',
        domErr.message,
        domErr.code
      );
    }
  }

  // Caso de uso: Cambiar estado del pedido
  async function handleTransitionOrder(pedidoId: string, nuevoEstado: OrderStatus, expectedVersion: number) {
    try {
      const detalle =
        nuevoEstado === 'fallido'
          ? failReasonInput.trim() || 'Cliente ausente en dirección de entrega tras espera reglamentaria'
          : undefined;

      const res = await runtime.changeOrderStatus.execute({
        pedidoId,
        nuevoEstado,
        expectedVersion,
        detalle,
        actor: activeProfile,
      });
      setFailReasonInput('');
      syncSnapshot();
      showNotification(
        'success',
        `Pedido ${res.order.codigo} → ${nuevoEstado.toUpperCase()}`,
        `Transición registrada en bitácora (v${res.order.version}). ${
          res.updatedCourier
            ? `Cupo liberado en ${res.updatedCourier.nombre} (${res.updatedCourier.cargaActual}/${res.updatedCourier.capacidadMaxima}).`
            : ''
        }`
      );
    } catch (err) {
      const domErr = err as DomainRuleError;
      showNotification('error', 'Transición Inválida', domErr.message, domErr.code);
    }
  }

  // Caso de uso: Crear Pedido
  async function handleCreateOrderSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await runtime.createOrder.execute({
        ...newOrderForm,
        actor: activeProfile,
      });
      syncSnapshot();
      setSelectedOrderId(res.order.id);
      setInspectorTab('order');
      setIsNewOrderOpen(false);
      setFocusCoords([res.order.destinoLat, res.order.destinoLng]);
      showNotification(
        'success',
        `Pedido ${res.order.codigo} Creado`,
        `Registrado en estado 'pendiente' (v1) desde el punto ${res.order.distribuidorId}.`
      );
    } catch (err) {
      const domErr = err as DomainRuleError;
      showNotification('error', 'No se pudo crear el pedido', domErr.message, domErr.code);
    }
  }

  // Caso de uso: Iniciar / Terminar Turno de Domiciliario
  async function handleToggleShift(courierId: string, nextShift: boolean) {
    try {
      const updated = await runtime.toggleCourierShift.execute({
        domiciliarioId: courierId,
        enTurno: nextShift,
        actor: activeProfile,
      });
      syncSnapshot();
      showNotification(
        'success',
        nextShift ? 'Turno Iniciado' : 'Turno Finalizado',
        `${updated.nombre} ahora está ${updated.enTurno ? 'EN TURNO y con GPS fresco' : 'FUERA DE TURNO'}.`
      );
    } catch (err) {
      const domErr = err as DomainRuleError;
      showNotification('error', 'Acción de turno bloqueada', domErr.message, domErr.code);
    }
  }

  // Caso de uso: Crear / Actualizar Distribuidor
  async function handleCreateDistributorSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await runtime.manageDistributors.upsert({
        ...distForm,
        actor: activeProfile,
      });
      syncSnapshot();
      setSelectedDistributorId(created.id);
      setIsNewDistributorOpen(false);
      showNotification(
        'success',
        `Distribuidor ${created.codigo} Guardado`,
        `${created.nombre} validado en segmento '${created.segmento}' y etapa '${created.etapaComercial}'.`
      );
    } catch (err) {
      const domErr = err as DomainRuleError;
      showNotification('error', 'Validación de Distribuidor Fallida', domErr.message, domErr.code);
    }
  }

  // Caso de uso: Cambiar Rol de Perfil (RBAC)
  async function handleChangeRole(targetProfileId: string, nuevoRol: UserRole) {
    try {
      const updated = await runtime.manageProfiles.changeUserRole({
        targetProfileId,
        nuevoRol,
        actor: activeProfile,
      });
      syncSnapshot();
      showNotification(
        'success',
        'Rol de Usuario Actualizado',
        `El usuario ${updated.nombre} ahora tiene el perfil '${updated.rol.toUpperCase()}'.`
      );
    } catch (err) {
      const domErr = err as DomainRuleError;
      showNotification('error', 'Regla de Seguridad de Perfiles', domErr.message, domErr.code);
    }
  }

  // Registrar cuenta nueva en estado 'pendiente'
  async function handleRegisterPendingUser(data: {
    nombre: string;
    email: string;
    cargo: string;
    distribuidorId?: string;
  }) {
    const newProfile: UserProfile = {
      id: `usr-${Date.now()}`,
      email: data.email,
      nombre: data.nombre,
      rol: 'pendiente',
      cargo: data.cargo,
      avatarColor: '#64748b',
      distribuidorId: data.distribuidorId ?? 'dist-01',
      domiciliarioId: null,
      aprobado: false,
      ultimoAcceso: new Date().toISOString(),
    };
    await runtime.ports.profiles.save(newProfile);
    syncSnapshot();
    setActiveProfileId(newProfile.id);
    identityAdapter.saveSessionProfileId(newProfile.id);
    showNotification(
      'info',
      'Cuenta Creada en Estado Pendiente',
      `Bienvenido ${newProfile.nombre}. Tu cuenta requiere aprobación de un Administrador para operar.`
    );
  }

  // KPIs Globales en vivo
  const kpis = useMemo(() => {
    const totalOrders = snapshot.orders.length;
    const pending = snapshot.orders.filter((o) => o.estado === 'pendiente').length;
    const inProgress = snapshot.orders.filter(
      (o) => o.estado === 'asignado' || o.estado === 'en_ruta'
    ).length;
    const delivered = snapshot.orders.filter((o) => o.estado === 'entregado').length;
    const activeCouriers = snapshot.couriers.filter((c) => c.enTurno).length;
    const freshGpsCouriers = snapshot.couriers.filter(
      (c) => c.enTurno && !isCourierLocationStale(c.ultimoReporteGps)
    ).length;
    const totalUsedSlots = snapshot.couriers.reduce((acc, c) => acc + c.cargaActual, 0);
    const totalMaxSlots = snapshot.couriers.reduce((acc, c) => acc + c.capacidadMaxima, 0);

    return {
      totalOrders,
      pending,
      inProgress,
      delivered,
      activeCouriers,
      freshGpsCouriers,
      totalUsedSlots,
      totalMaxSlots,
    };
  }, [snapshot]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* TOP BAR EMPRESARIAL */}
      <header className="sticky top-0 z-[1100] border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          {/* Logo y Nombre */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/20">
              <Compass className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-white">
                  RutaClara
                </span>
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                  CRM · ERP · ÚLTIMA MILLA
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Arquitectura Hexagonal · Bogotá D.C. ({snapshot.distributors.length} Distribuidores ·{' '}
                {snapshot.couriers.length} Domiciliarios · {snapshot.orders.length} Pedidos)
              </p>
            </div>
          </div>

          {/* Navegación de Módulos */}
          <nav className="flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-900/90 p-1">
            {[
              { id: 'map_control', label: 'Mapa & Torre de Control', icon: MapPin },
              { id: 'crm_erp', label: 'CRM / ERP Distribuidores', icon: Building2 },
              { id: 'fleet', label: 'Domiciliarios & GPS', icon: Truck },
              { id: 'architecture_admin', label: 'Perfiles, Bitácora & Arquitectura', icon: ShieldCheck },
            ].map((item) => {
              const Icon = item.icon;
              const active = mainTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setMainTab(item.id as MainTab)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    active
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Controles Rápidos: Simulador GPS + Selector de Perfil + Login */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSimulatingGps((v) => !v)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                isSimulatingGps
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 animate-pulse'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
              title="Mueve automáticamente los domiciliarios en turno a lo largo de sus rutas en Bogotá"
            >
              {isSimulatingGps ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-emerald-400 text-emerald-400" />
                  <span>GPS en Vivo: ACTIVO</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Simular Rutas GPS</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                runtime.store.resetToBogotaSeed();
                syncSnapshot();
                showNotification(
                  'info',
                  'Escenario Bogotá Restaurado',
                  'Se recargaron los 6 distribuidores, 5 domiciliarios y 12 pedidos iniciales.'
                );
              }}
              className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Restaurar datos demo originales de Bogotá"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            {/* Botón de Perfil Activo / Cambiar Login */}
            <button
              onClick={() => setIsLoginOpen(true)}
              className="flex items-center gap-2.5 rounded-2xl border border-slate-700/80 bg-slate-900 px-3.5 py-1.5 text-left hover:border-emerald-500/50 hover:bg-slate-800/90"
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: activeProfile.avatarColor }}
              >
                {activeProfile.nombre.slice(0, 2).toUpperCase()}
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">
                    {activeProfile.nombre.split('(')[0].trim()}
                  </span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase text-emerald-300">
                    {activeProfile.rol}
                  </span>
                </div>
                <span className="block text-[10px] text-slate-400">
                  Cambiar Perfil / Login ▾
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Barra rápida de cambio de perfil en 1 clic para evaluación inmediata */}
        <div className="border-t border-slate-900 bg-slate-950/95 px-4 py-1.5">
          <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-slate-400 mr-1">
                <KeyRound className="inline h-3 w-3 mr-1 text-emerald-400" />
                Cambio rápido de perfil (RBAC):
              </span>
              {snapshot.profiles.map((p) => {
                const isSelected = p.id === activeProfile.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSwitchProfile(p)}
                    className={`rounded-lg px-2.5 py-1 font-medium transition ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {p.rol.toUpperCase()} · {p.nombre.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 text-slate-400">
              <span>
                Pedidos Pendientes: <strong className="text-amber-300">{kpis.pending}</strong>
              </span>
              <span>
                En Ruta / Asignados: <strong className="text-emerald-300">{kpis.inProgress}</strong>
              </span>
              <span>
                Entregados: <strong className="text-teal-300">{kpis.delivered}</strong>
              </span>
              <span>
                Cupos Flota:{' '}
                <strong className="text-sky-300">
                  {kpis.totalUsedSlots}/{kpis.totalMaxSlots}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* NOTIFICACIÓN / TOAST DE REGLAS DE DOMINIO */}
      {toast && (
        <div className="mx-auto mt-3 w-full max-w-[1920px] px-4">
          <div
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-xs shadow-lg ${
              toast.type === 'error'
                ? 'border-rose-500/40 bg-rose-950/70 text-rose-100'
                : toast.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-950/70 text-emerald-100'
                  : 'border-sky-500/40 bg-sky-950/70 text-sky-100'
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === 'error' ? (
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
              ) : (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              )}
              <div>
                <div className="flex items-center gap-2 font-bold">
                  <span>{toast.title}</span>
                  {toast.code && (
                    <span className="rounded bg-black/40 px-2 py-0.5 font-mono text-[10px]">
                      {toast.code}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 opacity-90">{toast.message}</p>
              </div>
            </div>
            <button
              onClick={() => setToast(null)}
              className="rounded-lg px-2 py-1 text-xs font-semibold hover:bg-white/10"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* BLOQUEO DE SEGURIDAD PARA CUENTAS EN ESTADO 'PENDIENTE' */}
      {activeProfile.rol === 'pendiente' ? (
        <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="rounded-3xl border border-amber-500/30 bg-slate-900/90 p-8 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Lock className="h-8 w-8" />
            </div>
            <span className="mt-4 inline-block rounded-full bg-amber-500/20 px-3 py-1 font-mono text-xs font-bold uppercase text-amber-300">
              Perfil: PENDIENTE DE APROBACIÓN
            </span>
            <h1 className="mt-3 text-2xl font-extrabold text-white">
              Hola, {activeProfile.nombre}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Tu cuenta (<code className="font-mono text-amber-300">{activeProfile.email}</code>) ha sido registrada en RutaClara, pero de acuerdo con las reglas de dominio de seguridad (RBAC), las cuentas con rol{' '}
              <strong className="text-white">pendiente</strong> no tienen acceso al mapa operativo, pedidos ni CRM/ERP hasta que un{' '}
              <strong className="text-emerald-400">Administrador</strong> las apruebe.
            </p>
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left text-xs text-slate-400">
              <div className="font-bold text-slate-200 mb-1">
                Reglas de negocio verificadas en este estado:
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Ningún usuario puede asignarse ni aprobarse un rol a sí mismo (<code className="font-mono">SELF_ROLE_ASSIGNMENT_FORBIDDEN</code>).</li>
                <li>Cualquier intento de crear pedidos o asignar domiciliarios devuelve <code className="font-mono">ACCOUNT_PENDING_APPROVAL</code>.</li>
              </ul>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  const admin = snapshot.profiles.find((p) => p.rol === 'admin');
                  if (admin) {
                    handleSwitchProfile(admin);
                    setMainTab('architecture_admin');
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-xs font-bold text-slate-950 shadow-lg hover:bg-emerald-400"
              >
                <ShieldCheck className="h-4 w-4" />
                Cambiar a Administrador para Aprobar esta Cuenta
              </button>
              <button
                onClick={() => setIsLoginOpen(true)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Seleccionar otro Perfil
              </button>
            </div>
          </div>
        </main>
      ) : (
        /* CONTENIDO OPERATIVO PARA ADMIN, OPERADOR, DISTRIBUIDOR Y DOMICILIARIO */
        <main className="mx-auto flex w-full max-w-[1920px] flex-1 flex-col p-4">
          {/* =====================================================================
              VISTA 1: MAPA INTERACTIVO & TORRE DE CONTROL
             ===================================================================== */}
          {mainTab === 'map_control' && (
            <div className="grid flex-1 gap-4 xl:grid-cols-[360px_1fr_410px]">
              {/* COLUMNA IZQUIERDA: LISTA DE PEDIDOS Y NODOS */}
              <div className="flex flex-col rounded-2xl border border-slate-800/90 bg-slate-900/75 p-3.5 shadow-xl max-h-[calc(100vh-145px)]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Package className="h-4 w-4 text-emerald-400" />
                      Pedidos en Operación ({visibleOrders.length})
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      {activeProfile.rol === 'distribuidor'
                        ? 'Filtrado por tu Punto de Distribución'
                        : activeProfile.rol === 'domiciliario'
                          ? 'Filtrado por tus entregas asignadas'
                          : 'Vista global de Torre de Control'}
                    </p>
                  </div>
                  {hasPermission(activeProfile.rol, 'orders:create') && (
                    <button
                      onClick={() => {
                        if (activeProfile.rol === 'distribuidor' && activeProfile.distribuidorId) {
                          setNewOrderForm((prev) => ({
                            ...prev,
                            distribuidorId: activeProfile.distribuidorId!,
                          }));
                        }
                        setIsNewOrderOpen(true);
                      }}
                      className="flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow hover:bg-emerald-400"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nuevo Pedido
                    </button>
                  )}
                </div>

                {/* Buscador y Filtro de Estado */}
                <div className="mt-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar código, cliente, dirección..."
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(['todos', 'pendiente', 'asignado', 'en_ruta', 'entregado', 'fallido'] as const).map(
                      (st) => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`rounded-lg px-2 py-1 text-[10px] font-semibold uppercase transition ${
                            statusFilter === st
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Lista de Pedidos */}
                <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
                  {visibleOrders.map((ord) => {
                    const isSelected = selectedOrder?.id === ord.id;
                    const badge = STATUS_BADGE[ord.estado];
                    const dist = snapshot.distributors.find((d) => d.id === ord.distribuidorId);
                    const courier = snapshot.couriers.find((c) => c.id === ord.domiciliarioId);

                    return (
                      <div
                        key={ord.id}
                        onClick={() => {
                          setSelectedOrderId(ord.id);
                          setInspectorTab('order');
                          setFocusCoords([ord.destinoLat, ord.destinoLng]);
                        }}
                        className={`cursor-pointer rounded-xl border p-3 transition ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-950/25 shadow-md'
                            : 'border-slate-800/90 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-white">
                              {ord.codigo}
                            </span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                              v{ord.version}
                            </span>
                            {ord.prioridad === 'urgente' && (
                              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-300">
                                URGENTE
                              </span>
                            )}
                          </div>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        <div className="mt-1.5 text-xs font-bold text-slate-100">
                          {ord.clienteNombre}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          📍 {ord.direccionEntrega} ({ord.localidad})
                        </div>

                        <div className="mt-2 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-400">
                          <span className="truncate">
                            🏭 {dist?.codigo ?? ord.distribuidorId}
                          </span>
                          <span className="font-semibold text-slate-300">
                            {courier ? `🏍️ ${courier.nombre.split(' ')[0]}` : '⏳ Sin domiciliario'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COLUMNA CENTRAL: MAPA INTERACTIVO LEAFLET */}
              <div className="flex flex-col gap-3 min-h-[540px] xl:h-[calc(100vh-145px)]">
                {/* Controles de Capas del Mapa */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="flex items-center gap-1 font-semibold text-slate-300 mr-1">
                      <Layers className="h-3.5 w-3.5 text-emerald-400" />
                      Capas:
                    </span>
                    {[
                      { key: 'distributors', label: '🏭 Distribuidores (6)' },
                      { key: 'couriers', label: '🏍️ Domiciliarios (5)' },
                      { key: 'orders', label: '📦 Pedidos' },
                      { key: 'routes', label: '〰️ Rutas Activas' },
                      { key: 'gpsTrail', label: '🛰️ Rastro GPS' },
                      { key: 'coverageRadius', label: '⭕ Cobertura CRM' },
                    ].map((item) => {
                      const active = layers[item.key as keyof MapLayerVisibility];
                      return (
                        <button
                          key={item.key}
                          onClick={() =>
                            setLayers((prev) => ({
                              ...prev,
                              [item.key]: !prev[item.key as keyof MapLayerVisibility],
                            }))
                          }
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                            active
                              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                              : 'border-slate-800 bg-slate-950 text-slate-500'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1">
                    {(['osm', 'dark', 'light', 'schematic'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => setTileStyle(style)}
                        className={`rounded-lg px-2 py-1 text-[10px] font-semibold uppercase ${
                          tileStyle === style
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {style === 'dark' ? 'Oscuro' : style === 'light' ? 'Claro' : style === 'osm' ? 'Calles' : 'Esquema'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contenedor del Mapa */}
                <div className="flex-1 min-h-[460px]">
                  <RutaClaraMap
                    distributors={snapshot.distributors}
                    couriers={snapshot.couriers}
                    orders={visibleOrders}
                    gpsTraces={snapshot.gpsTraces}
                    selectedOrderId={selectedOrder?.id ?? null}
                    selectedDistributorId={selectedDistributor?.id ?? null}
                    selectedCourierId={selectedCourier?.id ?? null}
                    layers={layers}
                    tileStyle={tileStyle}
                    clickMode={clickMode}
                    focusCoords={focusCoords}
                    onSelectOrder={(id) => {
                      setSelectedOrderId(id);
                      setInspectorTab('order');
                    }}
                    onSelectDistributor={(id) => {
                      setSelectedDistributorId(id);
                      setInspectorTab('distributor');
                    }}
                    onSelectCourier={(id) => {
                      setSelectedCourierId(id);
                      setInspectorTab('courier');
                    }}
                    onMapCoordinatesPick={handleMapCoordinatesPick}
                    onTilesFailed={() => {
                      setTileStyle('schematic');
                      showNotification('info', 'Mapa en modo esquema', 'No se pudieron cargar las calles; se activó el mapa esquemático interactivo (funciona sin internet).');
                    }}
                  />
                </div>
              </div>

              {/* COLUMNA DERECHA: INSPECTOR CONTEXTUAL (PEDIDO / DISTRIBUIDOR / DOMICILIARIO) */}
              <div className="flex flex-col rounded-2xl border border-slate-800/90 bg-slate-900/75 p-3.5 shadow-xl max-h-[calc(100vh-145px)] overflow-y-auto">
                {/* Selector de pestaña del inspector */}
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950 p-1 mb-3">
                  <button
                    onClick={() => setInspectorTab('order')}
                    className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                      inspectorTab === 'order'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📦 Pedido
                  </button>
                  <button
                    onClick={() => setInspectorTab('distributor')}
                    className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                      inspectorTab === 'distributor'
                        ? 'bg-violet-500 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🏭 Distribuidor
                  </button>
                  <button
                    onClick={() => setInspectorTab('courier')}
                    className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                      inspectorTab === 'courier'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🏍️ Domiciliario
                  </button>
                </div>

                {/* =========================================================
                    INSPECTOR TAB 1: PEDIDO + ASIGNACIÓN ATÓMICA + BITÁCORA
                   ========================================================= */}
                {inspectorTab === 'order' && selectedOrder && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          {selectedOrder.codigo} · Versión v{selectedOrder.version}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            STATUS_BADGE[selectedOrder.estado].cls
                          }`}
                        >
                          {STATUS_BADGE[selectedOrder.estado].label}
                        </span>
                      </div>

                      <h3 className="mt-2 text-base font-bold text-white">
                        {selectedOrder.clienteNombre}
                      </h3>
                      <p className="text-xs text-slate-400">
                        📍 {selectedOrder.direccionEntrega} · {selectedOrder.localidad}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-900 p-2">
                          <span className="block text-[10px] text-slate-400">Carga / Valor</span>
                          <span className="font-semibold text-white">
                            {selectedOrder.pesoTotalKg} kg · $
                            {selectedOrder.valorTotalCop.toLocaleString('es-CO')}
                          </span>
                        </div>
                        <div className="rounded-lg bg-slate-900 p-2">
                          <span className="block text-[10px] text-slate-400">Nodo Origen</span>
                          <span className="font-semibold text-violet-300">
                            {snapshot.distributors.find((d) => d.id === selectedOrder.distribuidorId)
                              ?.codigo ?? selectedOrder.distribuidorId}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 rounded-lg bg-slate-900/70 p-2 text-xs text-slate-300">
                        <span className="font-semibold text-slate-400">Ítems:</span>{' '}
                        {selectedOrder.itemsResumen}
                      </div>
                    </div>

                    {/* Máquina de Estados del Pedido */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">
                          Máquina de Estados (Transiciones Válidas)
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          Optimistic Lock v{selectedOrder.version}
                        </span>
                      </div>

                      {VALID_ORDER_TRANSITIONS[selectedOrder.estado].length === 0 ? (
                        <div className="rounded-lg bg-slate-900 p-2.5 text-xs text-slate-400">
                          El pedido se encuentra en estado terminal (
                          <strong className="text-white">{selectedOrder.estado}</strong>). No admite más transiciones.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {VALID_ORDER_TRANSITIONS[selectedOrder.estado]
                              .filter((next) => next !== 'asignado')
                              .map((nextState) => (
                                <button
                                  key={nextState}
                                  onClick={() =>
                                    handleTransitionOrder(
                                      selectedOrder.id,
                                      nextState,
                                      selectedOrder.version
                                    )
                                  }
                                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                                    nextState === 'en_ruta'
                                      ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                                      : nextState === 'entregado'
                                        ? 'bg-teal-500 text-slate-950 hover:bg-teal-400'
                                        : nextState === 'fallido'
                                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  Pasar a: {nextState.replace('_', ' ').toUpperCase()}
                                </button>
                              ))}
                          </div>

                          {canTransitionOrder(selectedOrder.estado, 'fallido') && (
                            <input
                              type="text"
                              value={failReasonInput}
                              onChange={(e) => setFailReasonInput(e.target.value)}
                              placeholder="Motivo si es fallido (obligatorio por regla de dominio)..."
                              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Sugerencia de Domiciliarios Cercanos + Reserva Atómica */}
                    {selectedOrder.estado === 'pendiente' && (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-3.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                              <Navigation className="h-3.5 w-3.5" />
                              Sugerencia de Domiciliarios Cercanos
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              Ordenados por elegibilidad (turno, cupo, GPS ≤ 10m) y distancia Haversine
                            </p>
                          </div>
                        </div>

                        <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allowStaleOverride}
                            onChange={(e) => setAllowStaleOverride(e.target.checked)}
                            className="rounded border-slate-700"
                          />
                          <span>Permitir forzar asignación si GPS &gt; 10 min</span>
                        </label>

                        <div className="mt-2.5 space-y-2">
                          {suggestions.map((sug) => {
                            const { courier, evaluation } = sug;
                            return (
                              <div
                                key={courier.id}
                                className={`rounded-xl border p-2.5 text-xs ${
                                  evaluation.eligible
                                    ? 'border-slate-800 bg-slate-950/90'
                                    : 'border-slate-800/50 bg-slate-950/40 opacity-75'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <span>{courier.nombre}</span>
                                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                                      {sug.distanciaAOrigenKm} km · ETA {sug.etaMinutos}m
                                    </span>
                                  </div>
                                  <span className="font-mono text-[10px] font-bold text-slate-300">
                                    Cupo {courier.cargaActual}/{courier.capacidadMaxima}
                                  </span>
                                </div>

                                <div className="mt-1 flex items-center justify-between text-[10px]">
                                  <span
                                    className={
                                      evaluation.ubicacionDesactualizada
                                        ? 'text-amber-400 font-semibold'
                                        : 'text-slate-400'
                                    }
                                  >
                                    🛰️ GPS hace {evaluation.minutosDesdeUltimoGps} min{' '}
                                    {evaluation.ubicacionDesactualizada ? '(DESACTUALIZADO >10m)' : '(Fresco)'}
                                  </span>
                                  {evaluation.eligible || allowStaleOverride ? (
                                    <button
                                      onClick={() =>
                                        handleAssignCourier(
                                          selectedOrder.id,
                                          courier.id,
                                          selectedOrder.version
                                        )
                                      }
                                      className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-slate-950 hover:bg-emerald-400"
                                    >
                                      Asignar Cupo Atómico
                                    </button>
                                  ) : (
                                    <span className="text-rose-400 font-semibold">
                                      {evaluation.codigoRechazo}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Bitácora del Pedido */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-2.5">
                        <History className="h-3.5 w-3.5 text-sky-400" />
                        Bitácora de Eventos del Pedido ({selectedOrderEvents.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedOrderEvents.map((evt) => (
                          <div
                            key={evt.id}
                            className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-2.5 text-[11px]"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-emerald-300">
                                {evt.tipo} (v{evt.versionPedido})
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(evt.ocurridoEn).toLocaleTimeString('es-CO', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="mt-1 text-slate-200">{evt.descripcion}</p>
                            <div className="mt-1 text-[10px] text-slate-400">
                              Por: {evt.actorNombre} ({evt.actorRol})
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* =========================================================
                    INSPECTOR TAB 2: FICHA 360° DEL PUNTO DISTRIBUIDOR (CRM/ERP)
                   ========================================================= */}
                {inspectorTab === 'distributor' && selectedDistributor && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-violet-500/30 bg-slate-950/90 p-4">
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-violet-500/20 px-2 py-0.5 font-mono text-xs font-bold text-violet-300">
                          {selectedDistributor.codigo}
                        </span>
                        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                          Etapa CRM: {selectedDistributor.etapaComercial}
                        </span>
                      </div>

                      <h3 className="mt-2 text-base font-bold text-white">
                        {selectedDistributor.nombre}
                      </h3>
                      <p className="text-xs text-slate-400">
                        NIT: {selectedDistributor.nit} · Segmento:{' '}
                        <strong className="uppercase text-slate-200">
                          {selectedDistributor.segmento}
                        </strong>
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        📍 {selectedDistributor.direccion} ({selectedDistributor.localidad})
                      </p>

                      {/* Barra de Inventario ERP */}
                      <div className="mt-4 rounded-xl bg-slate-900 p-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Inventario ERP Disponible</span>
                          <span className="font-bold text-emerald-300">
                            {selectedDistributor.inventarioDisponibleUnidades} /{' '}
                            {selectedDistributor.capacidadAlmacenamientoUnidades} u.
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 to-emerald-400"
                            style={{
                              width: `${Math.min(
                                100,
                                (selectedDistributor.inventarioDisponibleUnidades /
                                  selectedDistributor.capacidadAlmacenamientoUnidades) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-900 p-2.5">
                          <span className="block text-[10px] text-slate-400">Cupo Crédito CRM</span>
                          <span className="font-bold text-white">
                            ${(selectedDistributor.cupoCreditoCop / 1000000).toFixed(0)}M COP
                          </span>
                        </div>
                        <div className="rounded-lg bg-slate-900 p-2.5">
                          <span className="block text-[10px] text-slate-400">Cumplimiento SLA</span>
                          <span className="font-bold text-emerald-400">
                            {selectedDistributor.cumplimientoSlaPct}%
                          </span>
                        </div>
                      </div>

                      {hasPermission(activeProfile.rol, 'orders:create') && (
                        <button
                          onClick={() => {
                            setNewOrderForm((prev) => ({
                              ...prev,
                              distribuidorId: selectedDistributor.id,
                            }));
                            setIsNewOrderOpen(true);
                          }}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-400"
                        >
                          <PackagePlus className="h-4 w-4" />
                          Crear Pedido desde este Punto Distribuidor
                        </button>
                      )}
                    </div>

                    {/* Lista rápida de todos los distribuidores */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-300">
                        Todos los Puntos de Distribución en Bogotá ({snapshot.distributors.length})
                      </h4>
                      {snapshot.distributors.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => {
                            setSelectedDistributorId(d.id);
                            setFocusCoords([d.lat, d.lng]);
                          }}
                          className={`cursor-pointer rounded-xl border p-2.5 text-xs transition ${
                            d.id === selectedDistributor.id
                              ? 'border-violet-500 bg-violet-950/25'
                              : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{d.nombre}</span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase text-violet-300">
                              {d.segmento}
                            </span>
                          </div>
                          <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                            <span>{d.localidad}</span>
                            <span>Etapa: {d.etapaComercial}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* =========================================================
                    INSPECTOR TAB 3: CONSOLA DE DOMICILIARIO & TELEMETRÍA GPS
                   ========================================================= */}
                {inspectorTab === 'courier' && selectedCourier && (
                  <div className="space-y-4">
                    {(() => {
                      const stale = isCourierLocationStale(selectedCourier.ultimoReporteGps);
                      const mins = getMinutesSinceLastGps(selectedCourier.ultimoReporteGps);
                      return (
                        <div className="rounded-xl border border-amber-500/30 bg-slate-950/90 p-4">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-amber-300">
                              {selectedCourier.codigo} · Placa {selectedCourier.placa}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                !selectedCourier.enTurno
                                  ? 'bg-slate-800 text-slate-400'
                                  : stale
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {!selectedCourier.enTurno
                                ? 'Fuera de Turno'
                                : stale
                                  ? `GPS Desactualizado (${mins}m > 10m)`
                                  : `En Turno · GPS Fresco (${mins}m)`}
                            </span>
                          </div>

                          <h3 className="mt-2 text-base font-bold text-white">
                            {selectedCourier.nombre}
                          </h3>
                          <p className="text-xs text-slate-400">
                            Zona base: {selectedCourier.zonaBase} · Tel: {selectedCourier.telefono}
                          </p>

                          {/* Capacidad y Restricción CHECK */}
                          <div className="mt-3 rounded-xl bg-slate-900 p-3">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">
                                Carga Actual vs Capacidad Máxima
                              </span>
                              <span className="font-bold text-white">
                                {selectedCourier.cargaActual} / {selectedCourier.capacidadMaxima} cupos
                              </span>
                            </div>
                            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full bg-amber-400"
                                style={{
                                  width: `${
                                    (selectedCourier.cargaActual / selectedCourier.capacidadMaxima) * 100
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="mt-1 block text-[10px] text-slate-400">
                              Protegido por reserva atómica y restricción SQL CHECK (carga ≤ capacidad)
                            </span>
                          </div>

                          {/* Botones de Turno y Reporte GPS */}
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              onClick={() =>
                                handleToggleShift(selectedCourier.id, !selectedCourier.enTurno)
                              }
                              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                                selectedCourier.enTurno
                                  ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                              }`}
                            >
                              {selectedCourier.enTurno ? 'Terminar Turno' : 'Iniciar Turno'}
                            </button>

                            <button
                              onClick={() =>
                                setClickMode((prev) =>
                                  prev === 'report_gps' ? 'none' : 'report_gps'
                                )
                              }
                              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                                clickMode === 'report_gps'
                                  ? 'bg-amber-400 text-slate-950'
                                  : 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                              }`}
                            >
                              {clickMode === 'report_gps'
                                ? 'Cancelar Clic en Mapa'
                                : '📍 Mover GPS en Mapa'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Selector de los 5 domiciliarios */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-300">
                        Flota de Domiciliarios ({snapshot.couriers.length})
                      </h4>
                      {snapshot.couriers.map((c) => {
                        const stale = isCourierLocationStale(c.ultimoReporteGps);
                        const mins = getMinutesSinceLastGps(c.ultimoReporteGps);
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCourierId(c.id);
                              setFocusCoords([c.lat, c.lng]);
                            }}
                            className={`cursor-pointer rounded-xl border p-2.5 text-xs transition ${
                              c.id === selectedCourier.id
                                ? 'border-amber-500 bg-amber-950/20'
                                : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{c.nombre}</span>
                              <span className="font-mono text-[10px] text-slate-300">
                                Cupo {c.cargaActual}/{c.capacidadMaxima}
                              </span>
                            </div>
                            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                              <span>{c.zonaBase}</span>
                              <span
                                className={
                                  !c.enTurno
                                    ? 'text-slate-500'
                                    : stale
                                      ? 'text-amber-400 font-semibold'
                                      : 'text-emerald-400'
                                }
                              >
                                {!c.enTurno ? 'Fuera de turno' : `GPS hace ${mins}m`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =====================================================================
              VISTA 2: CRM / ERP PUNTOS DE DISTRIBUCIÓN
             ===================================================================== */}
          {mainTab === 'crm_erp' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <div>
                  <h2 className="text-xl font-extrabold text-white">
                    Módulo CRM / ERP — Red de Puntos de Distribución en Bogotá
                  </h2>
                  <p className="text-xs text-slate-400">
                    Validación estricta de segmento comercial (Mayorista, Minorista, Horeca, E-commerce, Institucional), etapa del embudo CRM y capacidad de inventario ERP.
                  </p>
                </div>
                {hasPermission(activeProfile.rol, 'distributors:manage') && (
                  <button
                    onClick={() => setIsNewDistributorOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-violet-400"
                  >
                    <Plus className="h-4 w-4" />
                    Registrar Punto Distribuidor
                  </button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {snapshot.distributors.map((dist) => {
                  const nodeOrders = snapshot.orders.filter((o) => o.distribuidorId === dist.id);
                  const occupancyPct = Math.round(
                    (dist.inventarioDisponibleUnidades / dist.capacidadAlmacenamientoUnidades) * 100
                  );

                  return (
                    <div
                      key={dist.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-lg"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-violet-500/20 px-2.5 py-0.5 font-mono text-xs font-bold text-violet-300">
                            {dist.codigo}
                          </span>
                          <div className="flex gap-1.5">
                            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-200">
                              {dist.segmento}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                dist.etapaComercial === 'activo'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : dist.etapaComercial === 'en_riesgo'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {dist.etapaComercial}
                            </span>
                          </div>
                        </div>

                        <h3 className="mt-3 text-lg font-bold text-white">{dist.nombre}</h3>
                        <p className="text-xs text-slate-400">
                          📍 {dist.direccion} · Localidad {dist.localidad}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          NIT: {dist.nit} · Contacto: {dist.contactoNombre} ({dist.contactoTelefono})
                        </p>

                        <div className="mt-4 rounded-xl bg-slate-950 p-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Stock ERP vs Capacidad Bodega</span>
                            <span className="font-bold text-emerald-300">
                              {dist.inventarioDisponibleUnidades} / {dist.capacidadAlmacenamientoUnidades} u. ({occupancyPct}%)
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full bg-gradient-to-r from-violet-500 to-emerald-400"
                              style={{ width: `${Math.min(100, occupancyPct)}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-xl bg-slate-950 p-2">
                            <span className="block text-[10px] text-slate-400">Pedidos Activos</span>
                            <span className="font-bold text-white">{nodeOrders.length}</span>
                          </div>
                          <div className="rounded-xl bg-slate-950 p-2">
                            <span className="block text-[10px] text-slate-400">Cupo Crédito</span>
                            <span className="font-bold text-white">
                              ${(dist.cupoCreditoCop / 1000000).toFixed(0)}M
                            </span>
                          </div>
                          <div className="rounded-xl bg-slate-950 p-2">
                            <span className="block text-[10px] text-slate-400">SLA Nodo</span>
                            <span className="font-bold text-emerald-400">{dist.cumplimientoSlaPct}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2 border-t border-slate-800 pt-3">
                        <button
                          onClick={() => {
                            setSelectedDistributorId(dist.id);
                            setInspectorTab('distributor');
                            setFocusCoords([dist.lat, dist.lng]);
                            setMainTab('map_control');
                          }}
                          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                        >
                          Ver en Mapa
                        </button>
                        {hasPermission(activeProfile.rol, 'orders:create') && (
                          <button
                            onClick={() => {
                              setNewOrderForm((prev) => ({ ...prev, distribuidorId: dist.id }));
                              setIsNewOrderOpen(true);
                            }}
                            className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                          >
                            + Despachar Pedido
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =====================================================================
              VISTA 3: FLOTA DE DOMICILIARIOS & TELEMETRÍA GPS
             ===================================================================== */}
          {mainTab === 'fleet' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <h2 className="text-xl font-extrabold text-white">
                  Control de Flota de Domiciliarios, Turnos y Regla de Frescura GPS (10 Minutos)
                </h2>
                <p className="text-xs text-slate-400">
                  Cada domiciliario debe estar en turno, tener cupo libre (protegido por reserva atómica y restricción SQL CHECK) y contar con reporte GPS menor a 10 minutos.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {snapshot.couriers.map((courier) => {
                  const stale = isCourierLocationStale(courier.ultimoReporteGps);
                  const mins = getMinutesSinceLastGps(courier.ultimoReporteGps);
                  const assignedOrders = snapshot.orders.filter(
                    (o) =>
                      o.domiciliarioId === courier.id &&
                      (o.estado === 'asignado' || o.estado === 'en_ruta')
                  );

                  return (
                    <div
                      key={courier.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-lg"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-amber-300">
                            {courier.codigo} · {courier.placa}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              !courier.enTurno
                                ? 'bg-slate-800 text-slate-400'
                                : stale
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {!courier.enTurno
                              ? 'Fuera de Turno'
                              : stale
                                ? `GPS Desactualizado (${mins} min)`
                                : `En Turno · GPS Fresco (${mins} min)`}
                          </span>
                        </div>

                        <h3 className="mt-2 text-lg font-bold text-white">{courier.nombre}</h3>
                        <p className="text-xs text-slate-400">
                          Vehículo: <strong className="uppercase text-slate-200">{courier.vehiculo.replace('_', ' ')}</strong> · Zona: {courier.zonaBase}
                        </p>

                        <div className="mt-4 rounded-xl bg-slate-950 p-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Capacidad Operativa</span>
                            <span className="font-bold text-white">
                              {courier.cargaActual} / {courier.capacidadMaxima} pedidos activos
                            </span>
                          </div>
                          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full bg-emerald-500"
                              style={{
                                width: `${(courier.cargaActual / courier.capacidadMaxima) * 100}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 space-y-1.5">
                          <span className="text-[11px] font-semibold text-slate-400">
                            Pedidos actualmente a cargo ({assignedOrders.length}):
                          </span>
                          {assignedOrders.length === 0 ? (
                            <div className="rounded-lg bg-slate-950 p-2 text-xs text-slate-500">
                              Sin entregas activas en este momento.
                            </div>
                          ) : (
                            assignedOrders.map((o) => (
                              <div
                                key={o.id}
                                className="flex items-center justify-between rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs"
                              >
                                <span className="font-mono font-bold text-emerald-300">
                                  {o.codigo}
                                </span>
                                <span className="truncate max-w-[160px] text-slate-300">
                                  {o.clienteNombre}
                                </span>
                                <span className="uppercase text-[10px] font-bold text-sky-300">
                                  {o.estado}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2 border-t border-slate-800 pt-3">
                        <button
                          onClick={() => handleToggleShift(courier.id, !courier.enTurno)}
                          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                        >
                          {courier.enTurno ? 'Cerrar Turno' : 'Iniciar Turno'}
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await runtime.reportGpsLocation.execute({
                                domiciliarioId: courier.id,
                                lat: courier.lat + (Math.random() - 0.5) * 0.002,
                                lng: courier.lng + (Math.random() - 0.5) * 0.002,
                                actor: activeProfile,
                              });
                              syncSnapshot();
                              showNotification(
                                'success',
                                'Pulso GPS Recibido',
                                `Ubicación de ${courier.nombre} actualizada (< 1 min).`
                              );
                            } catch (err) {
                              const domErr = err as DomainRuleError;
                              showNotification('error', 'Error GPS', domErr.message, domErr.code);
                            }
                          }}
                          className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                        >
                          🛰️ Reportar GPS Ahora
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =====================================================================
              VISTA 4: PERFILES RBAC, BITÁCORA Y LABORATORIO DE ARQUITECTURA
             ===================================================================== */}
          {mainTab === 'architecture_admin' && (
            <div className="grid gap-6 xl:grid-cols-2">
              {/* Panel de Administración de Perfiles (RBAC) */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-400" />
                      Administración de Perfiles y Aprobación de Cuentas
                    </h3>
                    <p className="text-xs text-slate-400">
                      Regla de negocio activa: ningún usuario puede asignarse ni modificarse un rol a sí mismo.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {snapshot.profiles.map((prof) => {
                    const isSelf = prof.id === activeProfile.id;
                    return (
                      <div
                        key={prof.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{prof.nombre}</span>
                            {isSelf && (
                              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                TÚ
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400">
                            {prof.email} · {prof.cargo}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={prof.rol}
                            onChange={(e) => handleChangeRole(prof.id, e.target.value as UserRole)}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white"
                          >
                            {VALID_USER_ROLES.map((r) => (
                              <option key={r} value={r}>
                                Rol: {r.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Laboratorio Interactivo de Reglas de Dominio & Actividad 4 */}
              <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-emerald-400" />
                  Laboratorio de Verificación Arquitectónica (Actividad 3 y 4)
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Haz clic en cualquier escenario para probar en vivo las invariantes de <code className="font-mono text-emerald-300">core/domain</code> y los casos de uso de <code className="font-mono text-emerald-300">core/application</code>:
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() =>
                      handleChangeRole(activeProfile.id, 'admin')
                    }
                    className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-left hover:border-rose-500/50"
                  >
                    <div className="text-xs font-bold text-rose-300">
                      1. Probar Auto-Asignación de Rol
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Intenta que el usuario actual se cambie el rol a sí mismo. Verifica el error <code className="font-mono">SELF_ROLE_ASSIGNMENT_FORBIDDEN</code>.
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      handleAssignCourier(
                        'd1000000-0000-4000-8000-000000000001',
                        'dom-04', // Brayan tiene GPS hace 24 min (> 10 min)
                        1
                      )
                    }
                    className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-left hover:border-amber-500/50"
                  >
                    <div className="text-xs font-bold text-amber-300">
                      2. Probar Domiciliario con GPS &gt; 10 min
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Intenta asignar a Brayan López (último reporte hace 24 min). Verifica <code className="font-mono">COURIER_LOCATION_STALE</code>.
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      handleTransitionOrder('ped-05', 'entregado', 999)
                    }
                    className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-left hover:border-sky-500/50"
                  >
                    <div className="text-xs font-bold text-sky-300">
                      3. Probar Colisión Concurrente (Versión)
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Envía una transición con versión obsoleta (v999). Verifica <code className="font-mono">CONCURRENCY_CONFLICT</code>.
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      handleAssignCourier(
                        'd1000000-0000-4000-8000-000000000001',
                        'c0000000-0000-4000-8000-000000000001'
                      )
                    }
                    className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-left hover:border-emerald-500/50"
                  >
                    <div className="text-xs font-bold text-emerald-300">
                      4. Ejecutar Vertical Slice (Asignación Atómica)
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Asigna el pedido <code className="font-mono">RC-BOG-101</code> a Mateo Castellanos reservando su cupo de forma atómica.
                    </p>
                  </button>
                </div>

                {/* Bitácora Global */}
                <div className="mt-5 border-t border-slate-800 pt-4">
                  <h4 className="text-xs font-bold text-white mb-2">
                    Bitácora Global de Eventos de Dominio ({snapshot.events.length})
                  </h4>
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {snapshot.events.map((evt) => (
                      <div
                        key={evt.id}
                        className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs"
                      >
                        <div className="flex justify-between">
                          <span className="font-mono font-bold text-emerald-300">
                            {evt.tipo} · v{evt.versionPedido}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Pedido: {evt.pedidoId}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-300">{evt.descripcion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* MODAL DE LOGIN Y PERFILES */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        profiles={snapshot.profiles}
        distributors={snapshot.distributors}
        activeProfile={activeProfile}
        onSelectProfile={handleSwitchProfile}
        onRegisterPendingUser={handleRegisterPendingUser}
      />

      {/* MODAL DE CREACIÓN DE NUEVO PEDIDO */}
      {isNewOrderOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateOrderSubmit}
            className="w-full max-w-lg space-y-3.5 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Crear Nuevo Pedido de Última Milla
              </h3>
              <button
                type="button"
                onClick={() => setIsNewOrderOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cerrar ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">
                Punto de Distribución Origen
              </label>
              <select
                value={newOrderForm.distribuidorId}
                onChange={(e) =>
                  setNewOrderForm((prev) => ({ ...prev, distribuidorId: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              >
                {snapshot.distributors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.codigo} — {d.nombre} ({d.etapaComercial.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300">Cliente Destino</label>
                <input
                  type="text"
                  required
                  value={newOrderForm.clienteNombre}
                  onChange={(e) =>
                    setNewOrderForm((prev) => ({ ...prev, clienteNombre: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300">Teléfono</label>
                <input
                  type="text"
                  required
                  value={newOrderForm.clienteTelefono}
                  onChange={(e) =>
                    setNewOrderForm((prev) => ({ ...prev, clienteTelefono: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Dirección en Bogotá
                </label>
                <input
                  type="text"
                  required
                  value={newOrderForm.direccionEntrega}
                  onChange={(e) =>
                    setNewOrderForm((prev) => ({ ...prev, direccionEntrega: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300">Localidad</label>
                <input
                  type="text"
                  required
                  value={newOrderForm.localidad}
                  onChange={(e) =>
                    setNewOrderForm((prev) => ({ ...prev, localidad: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 items-end">
              <div>
                <label className="block text-[11px] text-slate-400">Latitud Destino</label>
                <input
                  type="number"
                  step="0.0001"
                  value={newOrderForm.destinoLat}
                  onChange={(e) =>
                    setNewOrderForm((prev) => ({ ...prev, destinoLat: Number(e.target.value) }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400">Longitud Destino</label>
                <input
                  type="number"
                  step="0.0001"
                  value={newOrderForm.destinoLng}
                  onChange={(e) =>
                    setNewOrderForm((prev) => ({ ...prev, destinoLng: Number(e.target.value) }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNewOrderOpen(false);
                  setMainTab('map_control');
                  setClickMode('pick_destination');
                }}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
              >
                🎯 Elegir en Mapa
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">
                Resumen de Ítems ERP
              </label>
              <input
                type="text"
                required
                value={newOrderForm.itemsResumen}
                onChange={(e) =>
                  setNewOrderForm((prev) => ({ ...prev, itemsResumen: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300">Peso (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={newOrderForm.pesoTotalKg}
                  onChange={(e) =>
                    setNewOrderForm((prev) => ({ ...prev, pesoTotalKg: Number(e.target.value) }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300">Valor (COP)</label>
                <input
                  type="number"
                  value={newOrderForm.valorTotalCop}
                  onChange={(e) =>
                    setNewOrderForm((prev) => ({
                      ...prev,
                      valorTotalCop: Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300">Prioridad</label>
                <select
                  value={newOrderForm.prioridad}
                  onChange={(e) =>
                    setNewOrderForm((prev) => ({
                      ...prev,
                      prioridad: e.target.value as OrderPriority,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  <option value="baja">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-500 py-3 text-xs font-bold text-slate-950 shadow-lg hover:bg-emerald-400"
            >
              Confirmar y Crear Pedido (Estado Inicial: PENDIENTE · v1)
            </button>
          </form>
        </div>
      )}

      {/* MODAL DE NUEVO PUNTO DISTRIBUIDOR CRM/ERP */}
      {isNewDistributorOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateDistributorSubmit}
            className="w-full max-w-lg space-y-3.5 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Registrar Punto de Distribución CRM / ERP
              </h3>
              <button
                type="button"
                onClick={() => setIsNewDistributorOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300">Razón Social / Nodo</label>
                <input
                  type="text"
                  required
                  value={distForm.nombre}
                  onChange={(e) => setDistForm((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej. Centro Logístico Cedritos"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300">NIT</label>
                <input
                  type="text"
                  required
                  value={distForm.nit}
                  onChange={(e) => setDistForm((p) => ({ ...p, nit: e.target.value }))}
                  placeholder="900.881.234-5"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300">Segmento CRM</label>
                <select
                  value={distForm.segmento}
                  onChange={(e) =>
                    setDistForm((p) => ({
                      ...p,
                      segmento: e.target.value as DistributorSegment,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  {VALID_DISTRIBUTOR_SEGMENTS.map((s) => (
                    <option key={s} value={s}>
                      {s.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300">Etapa Comercial</label>
                <select
                  value={distForm.etapaComercial}
                  onChange={(e) =>
                    setDistForm((p) => ({
                      ...p,
                      etapaComercial: e.target.value as CommercialStage,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  {VALID_COMMERCIAL_STAGES.map((st) => (
                    <option key={st} value={st}>
                      {st.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300">Dirección</label>
                <input
                  type="text"
                  required
                  value={distForm.direccion}
                  onChange={(e) => setDistForm((p) => ({ ...p, direccion: e.target.value }))}
                  placeholder="Calle 140 # 15-20"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300">Contacto Comercial</label>
                <input
                  type="text"
                  required
                  value={distForm.contactoNombre}
                  onChange={(e) => setDistForm((p) => ({ ...p, contactoNombre: e.target.value }))}
                  placeholder="Nombre del gerente"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-violet-500 py-3 text-xs font-bold text-white shadow-lg hover:bg-violet-400"
            >
              Validar y Guardar Distribuidor
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
