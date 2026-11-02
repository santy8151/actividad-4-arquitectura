-- Migración 0001: Datos de demostración en Bogotá (6 distribuidores, 5 domiciliarios, 12 pedidos con historial)

INSERT INTO distribuidores (id, codigo, nombre, nit, segmento, etapa_comercial, contacto_nombre, contacto_email, contacto_telefono, direccion, localidad, lat, lng, radio_cobertura_km, capacidad_almacenamiento_unidades, inventario_disponible_unidades, pedidos_mes_actual, cupo_credito_cop, cumplimiento_sla_pct)
VALUES
  ('dist-01', 'DIST-BOG-01', 'Centro Logístico Chapinero Alto', '900.412.881-1', 'ecommerce', 'activo', 'Laura Martínez', 'laura@chapinerohub.co', '+57 310 452 1101', 'Cra. 7 # 63-44, Bogotá', 'Chapinero', 4.6512, -74.0595, 5.0, 2400, 1890, 342, 85000000, 98.4),
  ('dist-02', 'DIST-BOG-02', 'Distribuidora Mayorista Paloquemao / Puente Aranda', '860.519.220-4', 'mayorista', 'activo', 'Carlos Eduardo Gómez', 'cgomez@mayoristapaloquemao.co', '+57 315 889 2300', 'Av. Américas # 36-28, Bogotá', 'Puente Aranda', 4.6238, -74.0954, 7.5, 4500, 3810, 518, 150000000, 96.8),
  ('dist-03', 'DIST-BOG-03', 'Nodo Horeca Parque de la 93 / Usaquén', '901.114.309-7', 'horeca', 'activo', 'Valentina Restrepo', 'vrestrepo@horecanorte.co', '+57 320 671 9942', 'Calle 93A # 13-24, Bogotá', 'Usaquén', 4.6768, -74.0482, 4.8, 1800, 1240, 275, 65000000, 99.1),
  ('dist-04', 'DIST-BOG-04', 'Punto Institucional Salitre / Fontibón', '900.778.102-3', 'institucional', 'activo', 'Andrés Felipe Pardo', 'apardo@salitrelogistica.co', '+57 311 334 8712', 'Av. El Dorado # 68C-61, Bogotá', 'Fontibón', 4.6595, -74.1088, 6.2, 3200, 2610, 194, 120000000, 95.5),
  ('dist-05', 'DIST-BOG-05', 'Abastos Sur / Kennedy Hub Minorista', '830.098.441-9', 'minorista', 'en_riesgo', 'Marta Lucía Rincón', 'mrincon@abastossur.co', '+57 318 902 4410', 'Av. Agostino Codazzi # 80-45, Bogotá', 'Kennedy', 4.6305, -74.1520, 5.5, 2800, 620, 148, 40000000, 89.2),
  ('dist-06', 'DIST-BOG-06', 'EcoBodega Suba Compartir (En Onboarding)', '901.552.710-2', 'minorista', 'negociacion', 'Jorge Iván Vargas', 'jvargas@ecobodegasuba.co', '+57 300 412 7788', 'Calle 145 # 91-19, Bogotá', 'Suba', 4.7410, -74.0845, 4.0, 1200, 900, 12, 25000000, 94.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO domiciliarios (id, codigo, nombre, telefono, vehiculo, placa, en_turno, carga_actual, capacidad_maxima, lat, lng, ultimo_reporte_gps, zona_base, calificacion, entregas_hoy, usuario_perfil_id)
VALUES
  ('c0000000-0000-4000-8000-000000000001', 'DOM-BOG-01', 'Mateo Castellanos', '+57 312 456 7801', 'moto', 'KLM-48G', TRUE, 2, 4, 4.6584, -74.0562, NOW() - INTERVAL '2 minutes', 'Chapinero / Zona T', 4.95, 11, 'usr-domiciliario'),
  ('dom-02', 'DOM-BOG-02', 'Camila Andrea Mora', '+57 314 789 0123', 'bicicleta_electrica', 'ECO-204', TRUE, 1, 3, 4.6795, -74.0510, NOW() - INTERVAL '1 minute', 'Usaquén / Calle 93', 4.92, 9, NULL),
  ('dom-03', 'DOM-BOG-03', 'Sebastián Rojas Beltrán', '+57 316 234 5678', 'van_carga', 'WXY-912', TRUE, 2, 5, 4.6380, -74.0890, NOW() - INTERVAL '4 minutes', 'Puente Aranda / Teusaquillo', 4.88, 14, NULL),
  ('dom-04', 'DOM-BOG-04', 'Brayan Stiven López', '+57 319 876 5432', 'moto', 'RTY-19F', TRUE, 1, 4, 4.6520, -74.1120, NOW() - INTERVAL '24 minutes', 'Salitre / Fontibón', 4.76, 7, NULL),
  ('dom-05', 'DOM-BOG-05', 'Diana Carolina Pineda', '+57 301 555 9087', 'camion_ligero', 'JKL-654', FALSE, 0, 6, 4.6290, -74.1390, NOW() - INTERVAL '45 minutes', 'Kennedy / Américas', 4.90, 8, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pedidos (id, codigo, distribuidor_id, domiciliario_id, cliente_nombre, cliente_telefono, direccion_entrega, localidad, origen_lat, origen_lng, destino_lat, destino_lng, items_resumen, peso_total_kg, valor_total_cop, prioridad, estado, version, notas)
VALUES
  ('d1000000-0000-4000-8000-000000000001', 'RC-BOG-101', 'dist-01', NULL, 'Clínica Marly — Farmacia Central', '+57 601 343 6600', 'Calle 50 # 9-67, Chapinero', 'Chapinero', 4.6512, -74.0595, 4.6378, -74.0642, '14x Kits Insumos Médicos Refrigerados', 6.5, 1450000, 'urgente', 'pendiente', 1, 'Entrega prioritaria bloque quirúrgico'),
  ('ped-02', 'RC-BOG-102', 'dist-03', NULL, 'Restaurante Osaki Calle 85', '+57 310 221 9080', 'Cra. 11 # 84-42, Zona T', 'Chapinero', 4.6768, -74.0482, 4.6682, -74.0531, '8x Cajas Insumos Horeca Frescos', 14.0, 980000, 'alta', 'pendiente', 1, 'Recibir en puerta de proveedores antes de 2pm'),
  ('ped-03', 'RC-BOG-103', 'dist-02', NULL, 'Ferretería Industrial El Tornillo', '+57 315 772 3110', 'Av. Cra. 30 # 19-45, Paloquemao', 'Los Mártires', 4.6238, -74.0954, 4.6195, -74.0840, '20x Cajas Herramienta Eléctrica Bosch', 28.5, 4200000, 'normal', 'pendiente', 1, 'Descarga en bodega lateral'),
  ('ped-04', 'RC-BOG-104', 'dist-04', NULL, 'Hotel Grand Hyatt Bogotá', '+57 601 654 1234', 'Calle 24A # 57-60, Ciudad Salitre', 'Teusaquillo', 4.6595, -74.1088, 4.6485, -74.0980, '30x Packs Lencería Institucional', 19.0, 2650000, 'alta', 'pendiente', 1, 'Entregar a jefe de economato'),
  ('ped-05', 'RC-BOG-105', 'dist-01', 'c0000000-0000-4000-8000-000000000001', 'Café Pergamino Zona G', '+57 311 409 8821', 'Cra. 5 # 69-12, Zona G', 'Chapinero', 4.6512, -74.0595, 4.6538, -74.0545, '12x Bolsas Café Especial Origen Huila 2.5kg', 30.0, 1890000, 'alta', 'en_ruta', 3, 'En desplazamiento por Cra 7'),
  ('ped-06', 'RC-BOG-106', 'dist-01', 'c0000000-0000-4000-8000-000000000001', 'Librería Lerner Norte', '+57 601 218 3400', 'Cra. 11 # 93A-43, Chicó', 'Chapinero', 4.6512, -74.0595, 4.6775, -74.0492, '6x Cajas Editorial Técnica', 11.2, 1120000, 'normal', 'asignado', 2, 'Segunda parada de la ruta de Mateo'),
  ('ped-07', 'RC-BOG-107', 'dist-03', 'dom-02', 'Bistró Francés Usaquén Plaza', '+57 320 998 1122', 'Cra. 6 # 118-25, Usaquén', 'Usaquén', 4.6768, -74.0482, 4.6952, -74.0315, '10x Cajas Vinos & Quesos Madurados', 15.4, 3150000, 'urgente', 'en_ruta', 3, 'Ruta ecológica en bici eléctrica'),
  ('ped-08', 'RC-BOG-108', 'dist-02', 'dom-03', 'Supermercado MercaTodo Galerías', '+57 317 611 4500', 'Calle 53 # 25-30, Galerías', 'Teusaquillo', 4.6238, -74.0954, 4.6422, -74.0755, '45x Cajas Abarrotes Mayoristas', 85.0, 5600000, 'alta', 'en_ruta', 3, 'Van de carga en ruta por NQS'),
  ('ped-09', 'RC-BOG-109', 'dist-04', 'dom-03', 'Centro Empresarial Connecta 26', '+57 601 742 9900', 'Av. Calle 26 # 92-32, Dorado', 'Fontibón', 4.6595, -74.1088, 4.6815, -74.1185, '18x Equipos Cómputo Corporativo', 34.0, 18900000, 'urgente', 'asignado', 2, 'Requiere acta firmada en recepción torre B'),
  ('ped-10', 'RC-BOG-110', 'dist-05', 'dom-04', 'Autoservicio La Gran Esquina Patio Bonito', '+57 318 220 3344', 'Calle 38 Sur # 86-15, Kennedy', 'Kennedy', 4.6305, -74.1520, 4.6365, -74.1610, '22x Pacas Bebidas & Lácteos', 42.0, 1780000, 'normal', 'en_ruta', 3, 'Domiciliario con señal GPS intermitente'),
  ('ped-11', 'RC-BOG-111', 'dist-03', 'dom-02', 'Panadería Artesanal Masa Calle 81', '+57 310 554 1290', 'Calle 81 # 9-12, El Retiro', 'Chapinero', 4.6768, -74.0482, 4.6645, -74.0538, '15x Sacos Harina Orgánica 10kg', 150.0, 1340000, 'normal', 'entregado', 4, 'Entregado a satisfacción con firma digital'),
  ('ped-12', 'RC-BOG-112', 'dist-05', NULL, 'Minimercado El Porvenir Bosa', '+57 314 339 8700', 'Calle 57 Sur # 88B-10, Bosa', 'Bosa', 4.6305, -74.1520, 4.6180, -74.1790, '16x Cajas Aceite Vegetal', 32.0, 2100000, 'normal', 'fallido', 4, 'Local cerrado en primer intento de entrega')
ON CONFLICT (id) DO NOTHING;

INSERT INTO perfiles (id, email, nombre, rol, cargo, avatar_color, distribuidor_id, domiciliario_id, aprobado)
VALUES
  ('usr-admin', 'admin@rutaclara.co', 'Santiago Suárez (Admin General)', 'admin', 'Director de Arquitectura & Operaciones', '#10b981', NULL, NULL, TRUE),
  ('usr-operador', 'operador@rutaclara.co', 'Daniela Ospina (Torre de Control)', 'operador', 'Coordinadora de Despacho Última Milla', '#3b82f6', NULL, NULL, TRUE),
  ('usr-distribuidor', 'distribuidor@rutaclara.co', 'Laura Martínez (Nodo Chapinero)', 'distribuidor', 'Gerente Comercial CRM/ERP Chapinero', '#8b5cf6', 'dist-01', NULL, TRUE),
  ('usr-domiciliario', 'domiciliario@rutaclara.co', 'Mateo Castellanos (Unidad DOM-01)', 'domiciliario', 'Domiciliario Motorizado Bogotá', '#f59e0b', NULL, 'c0000000-0000-4000-8000-000000000001', TRUE),
  ('usr-pendiente', 'nuevo.aliado@rutaclara.co', 'Felipe Mendoza (Cuenta Nueva)', 'pendiente', 'Solicitante Externo en Verificación', '#64748b', 'dist-06', NULL, FALSE)
ON CONFLICT (id) DO NOTHING;
