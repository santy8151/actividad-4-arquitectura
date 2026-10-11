# Matriz de trazabilidad

| REQ | Exigencia | Actividad 3 de origen | Implementación | Verificación/evidencia | Estado |
|---|---|---|---|---|---|
| REQ-01 | Vertical slice funcional | `AssignCourierUseCase`, asignar mensajero | `Program.cs`, `AssignCourierUseCase`, `Delivery` | Integración `AssignCourier_HappyPath_PersistsDeliveryAndOutboxEvent` | Implementado; integración pendiente CI |
| REQ-02 | Capas y contratos | ADR-001/prototipo de A3 | Domain; Application ports; Infrastructure adapters | Fitness function arquitectónica | Verificado local |
| REQ-03 | Integraciones y errores controlados | disponibilidad, capacidad y evento | HTTP/demo adapters, reintentos, outbox | Error por ruta llena; 503 integración caída | Implementado |
| REQ-04 | Migración reproducible | persistencia entrega/evento | `20261011000000_InitialCreate`, `Database.Migrate()` | Build Release; integración desde DB vacía pendiente CI | Implementado |
| REQ-05 | Trazabilidad de cambios | artefactos de A3 importados | ADR, wiki, Issues `KAN-XX` | historial Git y [Kanban](https://github.com/users/santy8151/projects/12) | En curso |
| REQ-06 | Unitarias e integración (éxito/error) | invariantes de entrega y BDD | `DeliveryTests`, `AssignmentApiTests` | unitarias 3/3; integración impedida localmente por App Control, CI pendiente | En curso |
| REQ-07 | Riesgos y seguridad | límites de contexto A3 | matriz de riesgos y CI | revisión documental; scan CI pendiente | En curso |
| REQ-08 | Señales sin datos sensibles | observabilidad de asignación | logs estructurados, métricas, ActivitySource | inspección de campos; exporter pendiente | Implementado con residual |
| REQ-09 | Fitness function | dominio como centro | `scripts/check_architecture.py` | comando pasa localmente | Verificado local |
| REQ-10 | Trade-offs y riesgo residual | consulta de capacidad A3 | ADR-002 y matriz de riesgos | revisión arquitectónica | Documentado |
| REQ-11 | Defensa de 10–15 min | flujo implementado | guion 12 min | grabación/cronómetro pendientes | En curso |
| REQ-12 | Repositorio ejecutable | N/A | solución, README, migración y CI | Release build: 0 errores/0 advertencias | Verificado |
| REQ-13 | Enlace del video | N/A | entrega | URL pública pendiente | Pendiente |
| REQ-14 | Expediente actualizado con diseño previo | A3 adjunta en `docs/activity-3/` | wiki, diagramas, ADR y trazas | enlaces navegables | Implementado |

Los issues del proyecto GitHub identifican `KAN-XX` y sus requisitos. No marcar CI/integraciones como verificadas sin salida real del workflow. El diseño de A3 está disponible en `docs/activity-3/`.
