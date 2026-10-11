# Matriz de trazabilidad

Une cada exigencia de Actividad 4 con el diseño previo, el componente implementado, su verificación y evidencia. Las referencias de Actividad 3 quedan pendientes hasta recibir ese material.

| ID | Requisito | Actividad 3 | Artefacto/componente | Verificación | Evidencia | Estado |
|---|---|---|---|---|---|---|
| REQ-01 | Implementar flujo principal como vertical slice | Pendiente | Slice a definir | Ejecución extremo a extremo | Pendiente | Por definir |
| REQ-02 | Conectar entrada, aplicación, dominio y persistencia por contratos | Pendiente | Capas y puertos | Revisión de dependencias + integración | Pendiente | Por definir |
| REQ-03 | Adaptadores externos y controles pertinentes, si aplican | Pendiente | Adaptadores | Simular indisponibilidad/reintento/fallo | Pendiente | Por definir |
| REQ-04 | Migraciones reproducibles si cambia el esquema | Pendiente | Migraciones | Aplicar desde base limpia | Pendiente | Condicional |
| REQ-05 | Historial de cambios y ajustes al diseño documentados | Diseño pendiente | ADRs + commits | Revisar ADR y log | [Project/Issues](https://github.com/users/santy8151/projects/12) | En curso |
| REQ-06 | Pruebas unitarias de invariantes e integración | Invariantes pendientes | Suite de pruebas | Suite con caso de error/límite | Pendiente | Por definir |
| REQ-07 | Riesgos de operación y seguridad, mitigaciones y evidencia | Pendiente | Riesgos | Escaneo/control aplicable | Pendiente | En curso |
| REQ-08 | Observabilidad diagnóstica sin exponer datos sensibles | Pendiente | Logs, métricas, trazas | Inspección de telemetría | Pendiente | En curso |
| REQ-09 | Calidad/arquitectura automatizada y resultados | Pendiente | Fitness function/CI | Ejecución local/CI | Pendiente | Por definir |
| REQ-10 | Riesgos residuales y próximos pasos | Pendiente | Riesgos + registro | Revisión al cierre | Pendiente | En curso |
| REQ-11 | Defensa final de 10-15 minutos | Slice y ADRs finales | Guion + video | Duración/cobertura | Enlace pendiente | Por definir |
| REQ-12 | Repositorio ejecutable con README e historial | N/A | Este repo | Clonar y seguir README | [GitHub](https://github.com/santy8151/actividad-4-arquitectura) | En curso |
| REQ-13 | Enlace al video; no adjuntar archivo | N/A | Entrega | Abrir enlace con permisos | Enlace pendiente | Por definir |
| REQ-14 | Expediente actualizado con diagramas y decisiones previas | Actividad 2/3 pendientes | Wiki y diagramas | Revisar consistencia y enlaces | Pendiente | Por definir |

## Reglas

- Estados: `Pendiente`, `En curso`, `Verificado`, `Bloqueado`.
- Enlazar issue/PR/commit en artefacto o evidencia.
- No marcar `Verificado` sin un comando o evidencia reproducible.
- Mantener vínculos entre requisito, ADR, componente, prueba y evidencia de defensa.
