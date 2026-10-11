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
