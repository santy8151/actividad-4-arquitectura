import { useEffect } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  getMinutesSinceLastGps,
  isCourierLocationStale,
  type Courier,
  type Distributor,
  type GpsTracePoint,
  type Order,
} from '@core/domain';

export type MapClickMode = 'none' | 'report_gps' | 'pick_destination';
export type MapTileStyle = 'dark' | 'light' | 'osm';

export interface MapLayerVisibility {
  distributors: boolean;
  couriers: boolean;
  orders: boolean;
  routes: boolean;
  gpsTrail: boolean;
  coverageRadius: boolean;
}

interface RutaClaraMapProps {
  distributors: Distributor[];
  couriers: Courier[];
  orders: Order[];
  gpsTraces: GpsTracePoint[];
  selectedOrderId: string | null;
  selectedDistributorId: string | null;
  selectedCourierId: string | null;
  layers: MapLayerVisibility;
  tileStyle: MapTileStyle;
  clickMode: MapClickMode;
  focusCoords: [number, number] | null;
  onSelectOrder: (orderId: string) => void;
  onSelectDistributor: (distributorId: string) => void;
  onSelectCourier: (courierId: string) => void;
  onMapCoordinatesPick?: (lat: number, lng: number) => void;
}

function MapViewportController({ focusCoords }: { focusCoords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (focusCoords) {
      map.flyTo(focusCoords, Math.max(map.getZoom(), 14), {
        duration: 0.8,
      });
    }
  }, [focusCoords, map]);
  return null;
}

function MapClickHandler({
  clickMode,
  onPick,
}: {
  clickMode: MapClickMode;
  onPick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (clickMode !== 'none' && onPick) {
        onPick(
          Math.round(e.latlng.lat * 100000) / 100000,
          Math.round(e.latlng.lng * 100000) / 100000
        );
      }
    },
  });
  return null;
}

function createDistributorIcon(dist: Distributor, isSelected: boolean): L.DivIcon {
  const stageColor =
    dist.etapaComercial === 'activo'
      ? '#8b5cf6'
      : dist.etapaComercial === 'en_riesgo'
        ? '#f59e0b'
        : '#64748b';

  const ring = isSelected
    ? `box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.45), 0 10px 20px rgba(0,0,0,0.5); transform: scale(1.1);`
    : `box-shadow: 0 6px 14px rgba(0,0,0,0.45);`;

  return L.divIcon({
    className: 'rc-custom-pin',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -20],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        <div style="width:36px;height:36px;border-radius:10px;background:${stageColor};border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:11px;${ring}">
          🏭
        </div>
        <span style="margin-top:2px;padding:1px 5px;border-radius:4px;background:#0f172a;color:#e2e8f0;border:1px solid ${stageColor};font-size:9px;font-weight:700;white-space:nowrap;">
          ${dist.codigo.replace('DIST-BOG-', 'NODO-')}
        </span>
      </div>
    `,
  });
}

function createCourierIcon(courier: Courier, isSelected: boolean): L.DivIcon {
  const stale = isCourierLocationStale(courier.ultimoReporteGps);
  const bg = !courier.enTurno
    ? '#475569'
    : stale
      ? '#d97706'
      : '#10b981';

  const vehicleEmoji =
    courier.vehiculo === 'bicicleta_electrica'
      ? '🚲'
      : courier.vehiculo === 'van_carga'
        ? '🚐'
        : courier.vehiculo === 'camion_ligero'
          ? '🚚'
          : '🏍️';

  const ring = isSelected
    ? `box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.5), 0 8px 18px rgba(0,0,0,0.6); transform: scale(1.12);`
    : `box-shadow: 0 6px 14px rgba(0,0,0,0.5);`;

  return L.divIcon({
    className: 'rc-custom-pin',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -22],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;position:relative;">
        <div style="width:36px;height:36px;border-radius:9999px;background:${bg};border:2.5px solid #ffffff;display:flex;align-items:center;justify-content:center;font-size:16px;${ring}">
          ${vehicleEmoji}
        </div>
        <span style="margin-top:2px;padding:1px 6px;border-radius:999px;background:#020617;color:#f8fafc;border:1px solid ${bg};font-size:9px;font-weight:700;white-space:nowrap;">
          ${courier.nombre.split(' ')[0]} · ${courier.cargaActual}/${courier.capacidadMaxima}
        </span>
      </div>
    `,
  });
}

function createOrderIcon(order: Order, isSelected: boolean): L.DivIcon {
  const colorMap: Record<Order['estado'], string> = {
    pendiente: '#f59e0b',
    asignado: '#3b82f6',
    en_ruta: '#10b981',
    entregado: '#14b8a6',
    fallido: '#f43f5e',
    cancelado: '#64748b',
  };
  const color = colorMap[order.estado] ?? '#3b82f6';
  const scale = isSelected ? 'transform: scale(1.18);' : '';

  return L.divIcon({
    className: 'rc-custom-pin',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;${scale}">
        <div style="width:28px;height:28px;border-radius:8px;background:${color};border:2px solid #0f172a;box-shadow:0 4px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:800;">
          📦
        </div>
        <span style="margin-top:1px;padding:0px 4px;border-radius:3px;background:rgba(15,23,42,0.92);color:#f8fafc;border:1px solid ${color};font-size:8.5px;font-weight:700;white-space:nowrap;">
          ${order.codigo.replace('RC-BOG-', '#')}
        </span>
      </div>
    `,
  });
}

const TILE_URLS: Record<MapTileStyle, { url: string; attribution: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
};

export function RutaClaraMap({
  distributors,
  couriers,
  orders,
  gpsTraces,
  selectedOrderId,
  selectedDistributorId,
  selectedCourierId,
  layers,
  tileStyle,
  clickMode,
  focusCoords,
  onSelectOrder,
  onSelectDistributor,
  onSelectCourier,
  onMapCoordinatesPick,
}: RutaClaraMapProps) {
  const bogotaCenter: [number, number] = [4.653, -74.083];
  const tileConfig = TILE_URLS[tileStyle];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-800/80 shadow-2xl">
      {clickMode !== 'none' && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full border border-emerald-400/50 bg-emerald-950/90 px-4 py-1.5 text-xs font-semibold text-emerald-200 shadow-lg backdrop-blur">
          {clickMode === 'report_gps'
            ? '📍 Haz clic en cualquier punto del mapa de Bogotá para reportar la nueva ubicación GPS del domiciliario'
            : '🎯 Haz clic en el mapa para fijar las coordenadas de entrega del nuevo pedido'}
        </div>
      )}

      <MapContainer
        center={bogotaCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
      >
        <TileLayer attribution={tileConfig.attribution} url={tileConfig.url} />
        <MapViewportController focusCoords={focusCoords} />
        <MapClickHandler clickMode={clickMode} onPick={onMapCoordinatesPick} />

        {/* Radios de cobertura de cada Distribuidor */}
        {layers.distributors &&
          layers.coverageRadius &&
          distributors.map((dist) => (
            <Circle
              key={`circle-${dist.id}`}
              center={[dist.lat, dist.lng]}
              radius={dist.radioCoberturaKm * 1000}
              pathOptions={{
                color: dist.etapaComercial === 'activo' ? '#8b5cf6' : '#f59e0b',
                weight: 1,
                fillOpacity: 0.05,
                dashArray: '4 6',
              }}
            />
          ))}

        {/* Líneas de Ruta de Pedidos: Punto Distribuidor -> Domiciliario -> Destino Cliente */}
        {layers.routes &&
          orders
            .filter((o) => o.estado !== 'cancelado')
            .map((order) => {
              const isSelected = order.id === selectedOrderId;
              const assignedCourier = order.domiciliarioId
                ? couriers.find((c) => c.id === order.domiciliarioId)
                : null;

              const color =
                order.estado === 'en_ruta'
                  ? '#10b981'
                  : order.estado === 'asignado'
                    ? '#3b82f6'
                    : order.estado === 'pendiente'
                      ? '#f59e0b'
                      : order.estado === 'fallido'
                        ? '#f43f5e'
                        : '#14b8a6';

              const points: [number, number][] = assignedCourier
                ? [
                    [order.origenLat, order.origenLng],
                    [assignedCourier.lat, assignedCourier.lng],
                    [order.destinoLat, order.destinoLng],
                  ]
                : [
                    [order.origenLat, order.origenLng],
                    [order.destinoLat, order.destinoLng],
                  ];

              return (
                <Polyline
                  key={`route-${order.id}`}
                  positions={points}
                  pathOptions={{
                    color,
                    weight: isSelected ? 4 : 2.2,
                    opacity: isSelected ? 0.95 : 0.55,
                    dashArray: order.estado === 'pendiente' ? '6 6' : order.estado === 'asignado' ? '8 4' : undefined,
                  }}
                />
              );
            })}

        {/* Rastro Histórico GPS por Domiciliario */}
        {layers.gpsTrail &&
          couriers.map((courier) => {
            const trace = gpsTraces
              .filter((t) => t.domiciliarioId === courier.id)
              .map((t) => [t.lat, t.lng] as [number, number]);
            if (trace.length < 2) return null;
            return (
              <Polyline
                key={`trail-${courier.id}`}
                positions={trace}
                pathOptions={{
                  color: '#38bdf8',
                  weight: 3,
                  opacity: 0.75,
                  dashArray: '3 6',
                }}
              />
            );
          })}

        {/* Marcadores de Distribuidores (Nodos CRM/ERP) */}
        {layers.distributors &&
          distributors.map((dist) => (
            <Marker
              key={dist.id}
              position={[dist.lat, dist.lng]}
              icon={createDistributorIcon(dist, dist.id === selectedDistributorId)}
              eventHandlers={{
                click: () => onSelectDistributor(dist.id),
              }}
            >
              <Popup>
                <div className="min-w-[230px] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-violet-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-300">
                      {dist.codigo}
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">
                      {dist.etapaComercial}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white">{dist.nombre}</div>
                  <div className="text-slate-400">{dist.direccion} ({dist.localidad})</div>
                  <div className="grid grid-cols-2 gap-1 pt-1 text-[11px]">
                    <div className="rounded bg-slate-900 p-1.5">
                      <span className="block text-[10px] text-slate-400">Segmento CRM</span>
                      <span className="font-semibold uppercase text-slate-200">{dist.segmento}</span>
                    </div>
                    <div className="rounded bg-slate-900 p-1.5">
                      <span className="block text-[10px] text-slate-400">Stock ERP</span>
                      <span className="font-semibold text-emerald-300">
                        {dist.inventarioDisponibleUnidades}/{dist.capacidadAlmacenamientoUnidades} u.
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Marcadores de Domiciliarios */}
        {layers.couriers &&
          couriers.map((courier) => {
            const stale = isCourierLocationStale(courier.ultimoReporteGps);
            const mins = getMinutesSinceLastGps(courier.ultimoReporteGps);
            return (
              <Marker
                key={courier.id}
                position={[courier.lat, courier.lng]}
                icon={createCourierIcon(courier, courier.id === selectedCourierId)}
                eventHandlers={{
                  click: () => onSelectCourier(courier.id),
                }}
              >
                <Popup>
                  <div className="min-w-[220px] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-emerald-300">
                        {courier.codigo} · {courier.placa}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          !courier.enTurno
                            ? 'bg-slate-700 text-slate-300'
                            : stale
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {!courier.enTurno ? 'Fuera de turno' : stale ? `GPS >10m (${mins}m)` : `En turno (${mins}m)`}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white">{courier.nombre}</div>
                    <div className="text-slate-400">Zona: {courier.zonaBase}</div>
                    <div className="rounded bg-slate-900 p-2">
                      <div className="flex justify-between text-[11px]">
                        <span>Cupo ocupado</span>
                        <span className="font-bold text-white">
                          {courier.cargaActual} / {courier.capacidadMaxima} pedidos
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${(courier.cargaActual / courier.capacidadMaxima) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Marcadores de Destino de cada Pedido */}
        {layers.orders &&
          orders.map((order) => (
            <Marker
              key={order.id}
              position={[order.destinoLat, order.destinoLng]}
              icon={createOrderIcon(order, order.id === selectedOrderId)}
              eventHandlers={{
                click: () => onSelectOrder(order.id),
              }}
            >
              <Popup>
                <div className="min-w-[230px] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-sky-300">
                      {order.codigo} (v{order.version})
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      {order.estado.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white">{order.clienteNombre}</div>
                  <div className="text-slate-300">{order.direccionEntrega}</div>
                  <div className="text-[11px] text-slate-400">{order.itemsResumen}</div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
