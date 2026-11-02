# RutaClara Enterprise — Plataforma CRM / ERP & Torre de Control de Última Milla

[![CI](https://github.com/santy8151/actividad-4-arquitectura/actions/workflows/ci.yml/badge.svg)](https://github.com/santy8151/actividad-4-arquitectura/actions/workflows/ci.yml)

**RutaClara** es una plataforma empresarial **CRM/ERP geoespacial con mapa interactivo en tiempo real** para operar la logística de última milla en Bogotá D.C. Muestra dónde está cada **punto de distribución (distribuidor)**, dónde se encuentra cada **domiciliario** (con turno, capacidad y rastro GPS) y por dónde va cada **pedido**, aplicando control de acceso basado en roles (**RBAC**) según el perfil de cada usuario (`admin`, `operador`, `distribuidor`, `domiciliario`, `pendiente`).

El repositorio integra tanto el **núcleo y aplicación web full-stack de RutaClara** (desplegable en **Vercel** y **Netlify**) como el **vertical slice en .NET 10 (`LastMile.sln`)** de la Actividad 4, ambos verificados automáticamente mediante *fitness functions* de Arquitectura Limpia / Onion Architecture.

---

## 1. Arquitectura Limpia y Capas del Sistema

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                     CAPA EXTERNA (Presentación & API)                        │
│  • Frontend React + Leaflet + Tailwind (src/App.tsx, RutaClaraMap.tsx)       │
│  • Serverless API Endpoints: Vercel (api/index.ts) & Netlify (functions/)    │
│  • API .NET 10 Minimal API (src/LastMile.Api)                                │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     CAPA DE INFRAESTRUCTURA (Adaptadores)                    │
│  • core/infrastructure: Repositorios transaccionales, semilla Bogotá y       │
│    conexión con Netlify Identity / Sesión RBAC.                              │
│  • db/schema.ts + Migraciones Drizzle/PostgreSQL con restricción CHECK.      │
│  • src/LastMile.Infrastructure: EF Core SQLite + Outbox Dispatcher.          │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                       CAPA DE APLICACIÓN (Casos de Uso)                      │
│  • core/application:                                                         │
│    - CreateOrderUseCase (creación validando etapa comercial del nodo)        │
│    - AssignCourierUseCase (reserva atómica de cupo + compensación ante fallo)│
│    - ChangeOrderStatusUseCase (transición con liberación automática de cupo) │
│    - SuggestNearbyCouriersUseCase (cálculo Haversine + elegibilidad GPS)     │
│    - ReportGpsLocationUseCase & ToggleCourierShiftUseCase                    │
│    - ManageDistributorsUseCase & ManageProfilesUseCase                       │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    NÚCLEO DE DOMINIO (Sin dependencias externas)             │
│  • core/domain:                                                              │
│    - Pedido: Máquina de estados (pendiente → asignado → en_ruta →            │
│      entregado | fallido + cancelado), versión concurrente y bitácora.       │
│    - Domiciliario: En turno, cupo libre y obsolescencia GPS (> 10 minutos).  │
│    - Distribuidor: Validación de segmento y etapa comercial CRM/ERP.         │
│    - Perfiles RBAC: admin, operador, distribuidor, domiciliario, pendiente   │
│      (ningún usuario puede asignarse un rol a sí mismo).                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Reglas de Dominio y Cierre de Riesgos de la Actividad 3

1. **Máquina de estados del pedido (`core/domain/order.ts`):**
   - Transiciones válidas: `pendiente → asignado → en_ruta → entregado | fallido`, más `cancelado`.
   - Cada cambio incrementa la `version` del pedido (`v1 → v2 → v3 → v4`) para detectar modificaciones simultáneas (*Optimistic Concurrency Control*) y genera un evento inmutable en la **bitácora (`bitacora_eventos`)**.
2. **Reserva atómica de cupo y compensación (`core/application/assignCourierUseCase.ts`):**
   - Cierra el riesgo de asignaciones concurrentes identificado en la Actividad 3: el caso de uso reserva primero el cupo del domiciliario de forma atómica (`tryReserveSlot`) y, si ocurre cualquier fallo al actualizar el pedido o registrar el evento, **libera inmediatamente el cupo (`releaseSlot`)**.
   - Además, la tabla `domiciliarios` cuenta con la restricción SQL `CHECK (carga_actual >= 0 AND carga_actual <= capacidad_maxima)`.
3. **Reglas del domiciliario (`core/domain/courier.ts`):**
   - Debe estar **en turno (`enTurno = true`)**, tener **cupo libre (`cargaActual < capacidadMaxima`)** y su ubicación GPS se marca como **desactualizada después de 10 minutos (`STALE_LOCATION_THRESHOLD_MINUTES = 10`)**.
4. **Validación CRM/ERP de distribuidores (`core/domain/distributor.ts`):**
   - Valida segmento (`mayorista`, `minorista`, `horeca`, `ecommerce`, `institucional`) y etapa comercial (`prospecto`, `negociacion`, `activo`, `en_riesgo`, `inactivo`), permitiendo despachar pedidos únicamente a nodos habilitados.
5. **Seguridad y Perfiles RBAC (`core/domain/profile.ts`):**
   - Perfiles soportados: `admin`, `operador`, `distribuidor`, `domiciliario` y `pendiente` (cuentas nuevas aún no aprobadas).
   - **Invariante de seguridad:** ningún usuario puede asignarse ni modificarse un rol a sí mismo (`SELF_ROLE_ASSIGNMENT_FORBIDDEN`).

---

## 3. Escenario de Demostración en Bogotá D.C.

Tanto la migración `netlify/database/migrations/0001_seed_bogota_demo.sql` como el almacén transaccional precargan el escenario operativo en Bogotá:
- **6 Puntos de Distribución (CRM/ERP):** Chapinero Alto (`DIST-BOG-01`), Paloquemao / Puente Aranda (`DIST-BOG-02`), Parque de la 93 / Usaquén (`DIST-BOG-03`), Salitre / Fontibón (`DIST-BOG-04`), Abastos Sur / Kennedy (`DIST-BOG-05`) y EcoBodega Suba (`DIST-BOG-06`).
- **5 Domiciliarios:** Mateo Castellanos (`DOM-BOG-01`, moto), Camila Mora (`DOM-BOG-02`, bici eléctrica), Sebastián Rojas (`DOM-BOG-03`, van de carga), Brayan López (`DOM-BOG-04`, con GPS > 10 min para demostrar bloqueo por ubicación desactualizada) y Diana Pineda (`DOM-BOG-05`, fuera de turno).
- **12 Pedidos (`RC-BOG-101` a `RC-BOG-112`):** incluyendo el ID del vertical slice (`d1000000-0000-4000-8000-000000000001`), con sus rutas geográficas origen → domiciliario → destino, versiones y bitácora de eventos.

---

## 4. Verificación de Calidad, Pruebas y Arquitectura

### Plataforma Web RutaClara (TypeScript / React / Vite / Vitest)

```bash
npm install
npm run check:arch   # Verifica fronteras Clean Architecture en core/ y solución .NET
npm run test         # Ejecuta pruebas automáticas de dominio y casos de uso (Vitest)
npm run build        # Compila TypeScript y genera el bundle de producción en dist/
npm run dev          # Inicia servidor de desarrollo local
```

### Solución Backend .NET 10 (`LastMile.sln`)

```bash
python3 scripts/check_architecture.py
dotnet build LastMile.sln --configuration Release
dotnet test LastMile.sln --configuration Release
```

---

## 5. Despliegue en Vercel y Netlify

- **Vercel (`vercel.json` + `api/index.ts`):** Configurado automáticamente con `buildCommand: "npm run build"`, `outputDirectory: "dist"` y Serverless Functions en `/api/*` y `/health`.
- **Netlify (`netlify.toml` + `netlify/functions/api.mts`):** Configurado con publicación en `dist`, funciones en `netlify/functions` y soporte para **Netlify Identity** + **Netlify Database (Drizzle)**.

---

## 6. Expediente Arquitectónico (Wiki & Docs)

- [Wiki Principal](wiki/Home.md)
- [Matriz de Trazabilidad](wiki/Trazabilidad.md)
- [Decisiones Arquitectónicas (ADRs)](wiki/Decisiones-Arquitectonicas.md)
- [Plan de Pruebas](wiki/Plan-de-Pruebas.md)
- [Riesgos y Observabilidad](wiki/Riesgos-y-Observabilidad.md)
- [Guion de Defensa](wiki/Guion-de-Defensa.md)
- [Checklist de Entrega](wiki/Checklist-de-Entrega.md)
