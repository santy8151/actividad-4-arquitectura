import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const distributors = pgTable('distribuidores', {
  id: text('id').primaryKey(),
  codigo: text('codigo').notNull().unique(),
  nombre: text('nombre').notNull(),
  nit: text('nit').notNull(),
  segmento: text('segmento').notNull(), // mayorista | minorista | horeca | ecommerce | institucional
  etapaComercial: text('etapa_comercial').notNull(), // prospecto | negociacion | activo | en_riesgo | inactivo
  contactoNombre: text('contacto_nombre').notNull(),
  contactoEmail: text('contacto_email').notNull(),
  contactoTelefono: text('contacto_telefono').notNull(),
  direccion: text('direccion').notNull(),
  localidad: text('localidad').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  radioCoberturaKm: doublePrecision('radio_cobertura_km').notNull().default(4.5),
  capacidadAlmacenamientoUnidades: integer('capacidad_almacenamiento_unidades').notNull().default(1500),
  inventarioDisponibleUnidades: integer('inventario_disponible_unidades').notNull().default(1000),
  pedidosMesActual: integer('pedidos_mes_actual').notNull().default(0),
  cupoCreditoCop: integer('cupo_credito_cop').notNull().default(50000000),
  cumplimientoSlaPct: doublePrecision('cumplimiento_sla_pct').notNull().default(96.5),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
});

export const couriers = pgTable(
  'domiciliarios',
  {
    id: text('id').primaryKey(),
    codigo: text('codigo').notNull().unique(),
    nombre: text('nombre').notNull(),
    telefono: text('telefono').notNull(),
    vehiculo: text('vehiculo').notNull(), // moto | bicicleta_electrica | van_carga | camion_ligero
    placa: text('placa').notNull(),
    enTurno: boolean('en_turno').notNull().default(true),
    cargaActual: integer('carga_actual').notNull().default(0),
    capacidadMaxima: integer('capacidad_maxima').notNull().default(4),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    ultimoReporteGps: timestamp('ultimo_reporte_gps', { withTimezone: true }).defaultNow().notNull(),
    zonaBase: text('zona_base').notNull(),
    calificacion: doublePrecision('calificacion').notNull().default(4.9),
    entregasHoy: integer('entregas_hoy').notNull().default(0),
    usuarioPerfilId: text('usuario_perfil_id'),
  },
  (table) => [
    check(
      'chk_domiciliario_capacidad',
      sql`${table.cargaActual} >= 0 AND ${table.cargaActual} <= ${table.capacidadMaxima}`
    ),
  ]
);

export const orders = pgTable(
  'pedidos',
  {
    id: text('id').primaryKey(),
    codigo: text('codigo').notNull().unique(),
    distribuidorId: text('distribuidor_id')
      .notNull()
      .references(() => distributors.id),
    domiciliarioId: text('domiciliario_id').references(() => couriers.id),
    clienteNombre: text('cliente_nombre').notNull(),
    clienteTelefono: text('cliente_telefono').notNull(),
    direccionEntrega: text('direccion_entrega').notNull(),
    localidad: text('localidad').notNull(),
    origenLat: doublePrecision('origen_lat').notNull(),
    origenLng: doublePrecision('origen_lng').notNull(),
    destinoLat: doublePrecision('destino_lat').notNull(),
    destinoLng: doublePrecision('destino_lng').notNull(),
    itemsResumen: text('items_resumen').notNull(),
    pesoTotalKg: doublePrecision('peso_total_kg').notNull().default(1.0),
    valorTotalCop: integer('valor_total_cop').notNull().default(0),
    prioridad: text('prioridad').notNull().default('normal'),
    estado: text('estado').notNull().default('pendiente'),
    version: integer('version').notNull().default(1),
    notas: text('notas'),
    motivoFallo: text('motivo_fallo'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
    asignadoEn: timestamp('asignado_en', { withTimezone: true }),
    enRutaEn: timestamp('en_ruta_en', { withTimezone: true }),
    finalizadoEn: timestamp('finalizado_en', { withTimezone: true }),
  },
  (table) => [
    index('idx_pedidos_distribuidor').on(table.distribuidorId),
    index('idx_pedidos_domiciliario').on(table.domiciliarioId),
    index('idx_pedidos_estado').on(table.estado),
  ]
);

export const orderEvents = pgTable(
  'bitacora_eventos',
  {
    id: text('id').primaryKey(),
    pedidoId: text('pedido_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    estadoAnterior: text('estado_anterior'),
    estadoNuevo: text('estado_nuevo').notNull(),
    versionPedido: integer('version_pedido').notNull(),
    actorId: text('actor_id').notNull(),
    actorNombre: text('actor_nombre').notNull(),
    actorRol: text('actor_rol').notNull(),
    domiciliarioId: text('domiciliario_id'),
    descripcion: text('descripcion').notNull(),
    ocurridoEn: timestamp('ocurrido_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_bitacora_pedido').on(table.pedidoId, table.ocurridoEn)]
);

export const gpsTraces = pgTable(
  'rastro_gps',
  {
    id: text('id').primaryKey(),
    domiciliarioId: text('domiciliario_id')
      .notNull()
      .references(() => couriers.id, { onDelete: 'cascade' }),
    pedidoId: text('pedido_id'),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    velocidadKmh: doublePrecision('velocidad_kmh').notNull().default(25),
    bateriaPct: integer('bateria_pct').notNull().default(90),
    registradoEn: timestamp('registrado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_rastro_gps_domiciliario').on(table.domiciliarioId, table.registradoEn)]
);

export const profiles = pgTable('perfiles', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  nombre: text('nombre').notNull(),
  rol: text('rol').notNull().default('pendiente'), // admin | operador | distribuidor | domiciliario | pendiente
  cargo: text('cargo').notNull(),
  avatarColor: text('avatar_color').notNull().default('#10b981'),
  distribuidorId: text('distribuidor_id'),
  domiciliarioId: text('domiciliario_id'),
  aprobado: boolean('aprobado').notNull().default(false),
  ultimoAcceso: timestamp('ultimo_acceso', { withTimezone: true }).defaultNow().notNull(),
});
