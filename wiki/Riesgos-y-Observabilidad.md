# Riesgos, mitigaciones y observabilidad

| ID | Riesgo | Mitigación | Evidencia/control | Residual |
|---|---|---|---|---|
| RSK-01 | Timeout/fallo de integración | 3 s timeout y hasta 3 reintentos en red/429/5xx; 503 sin cambios persistidos | HTTP adapters; integración configurable | latencia sumada; sin circuit breaker |
| RSK-02 | Solicitudes repetidas / doble asignación | invariant en dominio, version token de concurrencia | unit test reasignación; persistencia | cupo externo no queda reservado atómicamente |
| RSK-03 | Evento perdido al publicar | outbox guardado junto al estado; idempotency key; backoff y dead-letter tras 5 fallos | test observa outbox; dispatcher | dead-letter requiere alarma y reproceso operativo |
| RSK-04 | PII/secretos en logs | IDs técnicos/códigos/traceId únicamente; no loggear cuerpo, dirección o credencial | inspección API, EF logging reducido | falta verificar retención del collector futuro |
| RSK-05 | Input inválido | binding GUID, rechazo de `Guid.Empty`, códigos de error | POST valida courier | agregar rate limit/límites de request antes de exposición |
| RSK-06 | Carrera al consumir último cupo de ruta | estado de entrega usa control optimista | ADR-002 y contrato actual | capacity check es consulta, no reserva; usar reserva idempotente/saga |
| RSK-07 | Vulnerabilidad/dependencias y límites de capas | GitHub Actions revisa paquetes; script impide refs prohibidas | workflow + fitness function | CI todavía sin ejecución; DAST requiere entorno desplegado |
| RSK-08 | Esquema no reproducible/pérdida local | migración versionada y aplicada en arranque | `InitialCreate` y EF Migrate | SQLite demo sin HA/backups |
| RSK-09 | Defaults de demostración en producción | README describe adapters demo vs HTTP configurables | appsettings | añadir guard que impida demo en `Production` |
| RSK-10 | API sin identidad | solo local/demostración; agregar authn/authz antes del despliegue | README/checklist | no apropiada para exposición pública |

## Señales implementadas

- **Logs estructurados:** resultado, código, `DeliveryId`, trace/span IDs. No se escribe dirección ni payload.
- **Métricas:** `lastmile.assignment.results` y `lastmile.assignment.duration`; etiqueta `outcome` de cardinalidad baja.
- **Trazas:** Activity `assign-courier`, tag de outcome y correlación de trace/span.
- **Health:** `GET /health` verifica conexión a SQLite; no prueba disponibilidad de servicios externos.

No se configura exporter OpenTelemetry ni paneles/alertas. Agregarlos al desplegar; evitar etiquetas con IDs únicos y configurar retención acorde a política.

## Automatización

`python scripts/check_architecture.py` verifica dependencias permitidas entre proyectos. `.github/workflows/ci.yml` restaura, compila, corre tests y consulta vulnerabilidades transitivas. DAST no se reporta como ejecutado: requiere un servicio desplegado accesible.
