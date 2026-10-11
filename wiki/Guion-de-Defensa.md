# Guion de defensa final (10-15 minutos)

Guion provisional; completar con dominio, capturas y resultados reales. Duración sugerida: 12 minutos.

| Tiempo | Segmento | Qué mostrar/explicar |
|---|---|---|
| 0:00-1:30 | Problema y alcance | Necesidad, actor, flujo seleccionado de Actividad 3 y criterio de éxito. |
| 1:30-3:00 | Decisión arquitectónica y dominio | Diagrama, entidades/invariantes, contratos y límites; rol de infraestructura. |
| 3:00-6:30 | Demostración del slice | Entrada; DTO/validación; caso de uso; regla de dominio; puerto/adaptador; resultado persistido. |
| 6:30-8:30 | Pruebas | Suite; prueba unitaria de invariante, integración exitosa y error/límite. |
| 8:30-10:00 | Adaptadores y persistencia | Esquema/migración; estrategia de integración; timeout/reintento/fallo pertinente. |
| 10:00-11:30 | Seguridad, operación y observabilidad | Riesgo → mitigación → evidencia; telemetría sin sensibles; fitness function. |
| 11:30-12:30 | Trade-offs y cierre | Alcance fuera, riesgo residual y evolución futura; señalar repo/wiki/trazabilidad. |

## Preparación

- Probar el entorno limpio y comandos de demo desde README.
- Preparar un dato válido y otro que active el error/límite.
- Usar datos sintéticos y ocultar credenciales.
- Tener a mano salida de pruebas y matriz de trazabilidad.
- Ensayar con cronómetro y probar el enlace y sus permisos al publicar.
