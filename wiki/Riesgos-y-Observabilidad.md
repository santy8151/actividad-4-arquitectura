# Riesgos, mitigaciones y observabilidad

Tabla inicial: vincular controles y evidencias al flujo real, y documentar explícitamente el riesgo residual.

| ID | Riesgo | Mitigación prevista | Evidencia requerida | Estado/residual |
|---|---|---|---|---|
| RSK-01 | Timeout/fallo de base de datos o adaptador | Timeout acotado; error controlado; reintento solo si es idempotente; fallo simulado | Prueba de integración/telemetría | Pendiente |
| RSK-02 | Solicitud repetida duplica efecto | Idempotencia o unicidad, si aplica al dominio | Prueba de repetición | Pendiente |
| RSK-03 | Datos sensibles en telemetría | Lista permitida de campos; redactar tokens/PII; inspeccionar salidas | Logs de éxito y error | Pendiente |
| RSK-04 | Vulnerabilidad de entrada o dependencia | Validación; SAST/dependency scan; DAST si aplica | Informe de análisis | Pendiente |
| RSK-05 | Migración no reproducible | Migraciones versionadas, probadas desde base vacía | Ejecución reproducible | Condicional |
| RSK-06 | Dependencias rompen límites arquitectónicos | Fitness function en CI | Resultado CI | Pendiente |

## Señales mínimas propuestas

- **Logs estructurados:** `trace_id`, caso de uso, resultado, código de error, duración; sin payloads ni secretos.
- **Métricas:** solicitudes completadas/fallidas, latencia y fallos/timeouts del adaptador; etiquetas de baja cardinalidad.
- **Trazas:** entrada → aplicación → repositorio/adaptador; propagar contexto sin datos personales.
- **Detección:** umbrales de tasa de fallos y latencia acordes al entorno.

Concretar nombres y herramientas según el stack final y adjuntar evidencia verificable.
