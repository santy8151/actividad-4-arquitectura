# Decisiones arquitectónicas

Registrar cada decisión con contexto, opciones, consecuencias y riesgo residual. ADR-002 concreta el diseño de Actividad 3; consulte el material original adjunto en `docs/actividad-3.md`.

## ADR-000 — Expediente versionado

- **Estado:** Aceptada
- **Contexto:** La actividad requiere trazabilidad entre requisitos, diseño, implementación, pruebas, riesgos y defensa.
- **Decisión:** Mantener matriz y páginas del expediente en Markdown versionado en el repositorio.
- **Consecuencias:** La evidencia queda revisable junto al historial. El repositorio mantiene una copia en Markdown y un tablero operativo de GitHub Projects enlazado a issues.
- **Resultado:** El expediente se enlazó a Actividad 3 y la concreción de la implementación se registra en ADR-002.

## ADR-001 — Kanban operativo vinculado a issues

- **Estado:** Aceptada
- **Fecha:** 2026-10-11
- **Requisitos:** REQ-05, REQ-12
- **Contexto:** El trabajo necesita un tablero operable y trazable al repositorio, además de una copia legible/versionada en el expediente.
- **Opciones consideradas:** Kanban solo en Markdown; GitHub Projects; ambos con una fuente operativa explícita.
- **Decisión:** Usar el tablero privado de GitHub Projects como tablero operativo. Cada tarjeta es un issue del repositorio con ID `KAN-XX`, `REQ-XX`, criterios de aceptación y enlaces al expediente. Mantener `wiki/Tablero-Kanban.md` como espejo documental versionado.
- **Consecuencias y trade-offs:** Estado operativo y filtros viven en Projects; Markdown puede quedar desactualizado si no se sincroniza. Los issues y la matriz mantienen los enlaces de trazabilidad.
- **Riesgo residual:** Actualizar el tablero operativo y la copia Markdown como parte del cierre de cada tarjeta.
- **Evidencia / enlaces:** [Project Kanban](https://github.com/users/santy8151/projects/12), [Issues](https://github.com/santy8151/actividad-4-arquitectura/issues).

## Plantilla ADR

### ADR-NNN — Título

- **Estado:** Propuesta / Aceptada / Rechazada / Sustituida
- **Fecha:** AAAA-MM-DD
- **Requisitos:** REQ-XX
- **Contexto:**
- **Opciones consideradas:**
- **Decisión:**
- **Consecuencias y trade-offs:**
- **Riesgo residual:**
- **Evidencia/enlaces:**
### ADR-002 — Implementar AssignCourier con outbox transaccional y demos reemplazables

- **Estado:** Aceptada; valida el diseño de Actividad 3 y concreta aspectos que estaban abiertos.
- **Fecha:** 2026-10-11
- **Requisitos:** REQ-01..04, REQ-06..10, REQ-14
- **Contexto:** Actividad 3 seleccionó `AssignCourierUseCase` para asignar un courier a una entrega pendiente; declaró puertos de disponibilidad, capacidad, repositorio y eventos, y dejó la estrategia transaccional por definir.
- **Opciones consideradas:** mensajería/eventos directos tras guardar; escritura dual no transaccional; outbox en la misma transacción SQLite. Persistencia SQLite para demostración con adaptadores demo o adaptadores HTTP configurables.
- **Decisión:** usar .NET 10, API ASP.NET Core minimal, EF Core/SQLite y entidad de dominio `Delivery`. El caso de uso verifica primero disponibilidad y capacidad; la entidad protege la invariante; `DeliveryRecord` y evento `DeliveryAssigned` se confirman en una transacción local. Un worker publica desde outbox con clave idempotente, backoff y dead-letter. `Version` es token de concurrencia. Adaptadores HTTP son configurables, doubles demo predeterminados.
- **Consecuencias y trade-offs:** se entrega un slice ejecutable, verificable sin servicios externos ni infraestructura adicional. Reintentos de consulta suman latencia y las respuestas demo no equivalen a validación en un proveedor real.
- **Riesgo residual:** consulta de capacidad no reserva cupo; concurrencia entre entregas puede sobrepasar capacidad. Resolver con endpoint de reserva idempotente o saga antes de producción. API sin autenticación es solo demostrativa. Añadir exporter de telemetría para operación.
- **Evidencia/enlaces:** `src/LastMile.Application/AssignCourierUseCase.cs`, `src/LastMile.Infrastructure/Persistence/Migrations/20261011000000_InitialCreate.cs`, `tests/LastMile.IntegrationTests/AssignmentApiTests.cs`; diseño base en `docs/adr-actividad-3.md`.

### ADR-003 — Hacer explícita la arquitectura Onion y reducir estructura duplicada

- **Estado:** Aceptada
- **Fecha:** 2026-10-11
- **Requisitos:** REQ-02, REQ-05, REQ-09, REQ-14
- **Contexto:** La primera versión agrupaba varias clases en subcarpetas de una sola clase y duplicaba dentro del repositorio el prototipo de Actividad 3 junto con su implementación real. Eso hacía más difícil reconocer los anillos y la fuente vigente.
- **Decisión:** Mantener un proyecto por anillo funcional (`Domain`, `Application`, `Infrastructure`, `Api`), depender hacia el centro, aplanar carpetas pequeñas dentro de Domain/Application/API, conservar solo los documentos de diseño necesarios de A3 en una carpeta plana `docs/actividad-3.md`, y borrar el prototipo duplicado. Agrupar en Infrastructure solo por adaptador (`Persistence`, `Integrations`). API declara explícitamente sus referencias a núcleo y composición exterior.
- **Consecuencias:** La estructura visible coincide con la arquitectura; la fitness function comprueba el grafo exacto de proyectos. Se conserva la presentación y el material A3 útil para trazabilidad, sin mantener un segundo código fuente.
- **Riesgo residual:** El acceso entre anillos se controla a nivel de referencias de proyecto; ampliar en el futuro con reglas internas/analyzers si aparecen muchos módulos.
- **Evidencia:** README, `scripts/check_architecture.py`, `.github/workflows/ci.yml` y árbol `src/`.


### ADR-004 — Extensión RutaClara CRM/ERP con Mapa Geoespacial, Reserva Atómica de Cupo y Perfiles RBAC

- **Estado:** Aceptada
- **Fecha:** 2026-11-02
- **Requisitos:** REQ-01..10, REQ-12, REQ-14
- **Contexto:** ADR-002 dejó abiertos como riesgos residuales la reserva atómica de capacidad ante concurrencia (`RSK-06`), el control de identidad/roles (`RSK-10`) y la visualización operativa en mapa geoespacial para puntos de distribución (CRM/ERP), domiciliarios y pedidos en tiempo real.
- **Opciones consideradas:** (a) Mantener únicamente la API sin interfaz ni control de acceso; (b) Construir la plataforma web **RutaClara** siguiendo la misma disciplina de Arquitectura Limpia (`core/domain` → `core/application` → `core/infrastructure` → `api/` y `src/`) coexistiendo con el vertical slice `.NET 10`.
- **Decisión:** Implementar **RutaClara** con separación estricta de anillos verificada por `scripts/check-core-architecture.mjs`:
  1. `core/domain`: máquina de estados del pedido (`pendiente → asignado → en_ruta → entregado | fallido`, más `cancelado`), incremento de `version` optimista, bitácora de eventos, regla de obsolescencia GPS del domiciliario (> 10 minutos), validación CRM/ERP de distribuidor (segmento y etapa comercial) y matriz de permisos RBAC (`admin`, `operador`, `distribuidor`, `domiciliario`, `pendiente`) con prohibición explícita de auto-asignación de rol.
  2. `core/application`: `AssignCourierUseCase` reserva el cupo de forma atómica (`tryReserveSlot`) y ejecuta compensación automática (`releaseSlot`) si falla la persistencia del pedido o la bitácora, cerrando el riesgo de asignaciones simultáneas de la Actividad 3.
  3. `db/` y `netlify/database/migrations/`: esquema Drizzle/PostgreSQL con restricción `CHECK (carga_actual >= 0 AND carga_actual <= capacidad_maxima)` y migración semilla con 6 distribuidores, 5 domiciliarios y 12 pedidos en Bogotá.
  4. `src/` + `api/` + `netlify/functions/`: interfaz React + Leaflet + Tailwind y endpoints Serverless compatibles con Vercel y Netlify.
- **Consecuencias y trade-offs:** Se cierran los riesgos `RSK-06` y `RSK-10` con pruebas automatizadas (13 pruebas en Vitest + 5 pruebas en xUnit .NET) y doble *fitness function* arquitectónica (`npm run check:arch`).
- **Riesgo residual:** En despliegues serverless sin `DATABASE_URL` externa configurada, el adaptador opera sobre el almacén transaccional en memoria/localStorage con la semilla de Bogotá para garantizar disponibilidad cero-configuración en demostraciones.
- **Evidencia/enlaces:** `core/domain/`, `core/application/assignCourierUseCase.ts`, `db/schema.ts`, `scripts/check-core-architecture.mjs`, `tests/rutaclara.domain.test.ts`, `tests/rutaclara.application.test.ts`.
