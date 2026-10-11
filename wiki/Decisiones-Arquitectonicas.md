# Decisiones arquitectónicas

Registrar cada decisión con contexto, opciones, consecuencias y riesgo residual. ADR-002 concreta el diseño de Actividad 3; consulte el material original adjunto en `docs/activity-3/`.

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
- **Evidencia/enlaces:** `src/LastMile.Application/UseCases/AssignCourierUseCase.cs`, `src/LastMile.Infrastructure/Persistence/Migrations/20261011000000_InitialCreate.cs`, `tests/LastMile.IntegrationTests/AssignmentApiTests.cs`; diseño base en `docs/activity-3/docs/adr/ADR-001-arquitectura-limpia-y-ddd.md`.
