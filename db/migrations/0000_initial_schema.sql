-- Migración 0000: Esquema inicial de RutaClara CRM/ERP & Logística de Última Milla
-- Incluye restricción de integridad para impedir que la carga de un domiciliario supere su capacidad.

CREATE TABLE IF NOT EXISTS distribuidores (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  nit TEXT NOT NULL,
  segmento TEXT NOT NULL,
  etapa_comercial TEXT NOT NULL,
  contacto_nombre TEXT NOT NULL,
  contacto_email TEXT NOT NULL,
  contacto_telefono TEXT NOT NULL,
  direccion TEXT NOT NULL,
  localidad TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radio_cobertura_km DOUBLE PRECISION NOT NULL DEFAULT 4.5,
  capacidad_almacenamiento_unidades INTEGER NOT NULL DEFAULT 1500,
  inventario_disponible_unidades INTEGER NOT NULL DEFAULT 1000,
  pedidos_mes_actual INTEGER NOT NULL DEFAULT 0,
  cupo_credito_cop INTEGER NOT NULL DEFAULT 50000000,
  cumplimiento_sla_pct DOUBLE PRECISION NOT NULL DEFAULT 96.5,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS domiciliarios (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  vehiculo TEXT NOT NULL,
  placa TEXT NOT NULL,
  en_turno BOOLEAN NOT NULL DEFAULT TRUE,
  carga_actual INTEGER NOT NULL DEFAULT 0,
  capacidad_maxima INTEGER NOT NULL DEFAULT 4,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  ultimo_reporte_gps TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  zona_base TEXT NOT NULL,
  calificacion DOUBLE PRECISION NOT NULL DEFAULT 4.9,
  entregas_hoy INTEGER NOT NULL DEFAULT 0,
  usuario_perfil_id TEXT,
  CONSTRAINT chk_domiciliario_capacidad CHECK (carga_actual >= 0 AND carga_actual <= capacidad_maxima)
);

CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  distribuidor_id TEXT NOT NULL REFERENCES distribuidores(id),
  domiciliario_id TEXT REFERENCES domiciliarios(id),
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  direccion_entrega TEXT NOT NULL,
  localidad TEXT NOT NULL,
  origen_lat DOUBLE PRECISION NOT NULL,
  origen_lng DOUBLE PRECISION NOT NULL,
  destino_lat DOUBLE PRECISION NOT NULL,
  destino_lng DOUBLE PRECISION NOT NULL,
  items_resumen TEXT NOT NULL,
  peso_total_kg DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  valor_total_cop INTEGER NOT NULL DEFAULT 0,
  prioridad TEXT NOT NULL DEFAULT 'normal',
  estado TEXT NOT NULL DEFAULT 'pendiente',
  version INTEGER NOT NULL DEFAULT 1,
  notas TEXT,
  motivo_fallo TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  asignado_en TIMESTAMPTZ,
  en_ruta_en TIMESTAMPTZ,
  finalizado_en TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pedidos_distribuidor ON pedidos(distribuidor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_domiciliario ON pedidos(domiciliario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);

CREATE TABLE IF NOT EXISTS bitacora_eventos (
  id TEXT PRIMARY KEY,
  pedido_id TEXT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  version_pedido INTEGER NOT NULL,
  actor_id TEXT NOT NULL,
  actor_nombre TEXT NOT NULL,
  actor_rol TEXT NOT NULL,
  domiciliario_id TEXT,
  descripcion TEXT NOT NULL,
  ocurrido_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bitacora_pedido ON bitacora_eventos(pedido_id, ocurrido_en);

CREATE TABLE IF NOT EXISTS rastro_gps (
  id TEXT PRIMARY KEY,
  domiciliario_id TEXT NOT NULL REFERENCES domiciliarios(id) ON DELETE CASCADE,
  pedido_id TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  velocidad_kmh DOUBLE PRECISION NOT NULL DEFAULT 25,
  bateria_pct INTEGER NOT NULL DEFAULT 90,
  registrado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rastro_gps_domiciliario ON rastro_gps(domiciliario_id, registrado_en);

CREATE TABLE IF NOT EXISTS perfiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'pendiente',
  cargo TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#10b981',
  distribuidor_id TEXT,
  domiciliario_id TEXT,
  aprobado BOOLEAN NOT NULL DEFAULT FALSE,
  ultimo_acceso TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
